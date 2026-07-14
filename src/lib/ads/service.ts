import { prisma } from '../prisma'
import { AdPlatform, IntegrationStatus, JobStatus, AdJobType } from '@prisma/client'
import { AdapterFactory } from './factory'
import { encrypt, decrypt } from './encryption'

const ENCRYPTION_KEY = process.env.ADS_ENCRYPTION_KEY || ''

export class AdsService {
    /**
     * Enqueues a publishing job for a draft.
     */
    static async enqueuePublishJob(draftId: string, userId: string) {
        const draft = await prisma.adDraft.findUnique({ where: { id: draftId } })
        if (!draft) throw new Error('Draft not found')

        return (prisma.adJob as any).create({
            data: {
                userId,
                platform: draft.platform,
                type: AdJobType.PUBLISH,
                status: JobStatus.QUEUED,
                payload: { draftId } as any,
                idempotencyKey: `publish_${draftId}`
            }
        })
    }

    /**
     * Orchestrates the publishing of a draft to the remote platform with idempotency.
     */
    static async publishCampaign(draftId: string) {
        // Idempotency check: If already published, skip
        const existingMapping = await prisma.adRemoteMapping.findUnique({
            where: { draftId }
        })

        if (existingMapping) {
            console.log(`[AdsService] Draft ${draftId} already has a remote mapping. Skipping publication.`)
            return
        }

        const draft = await prisma.adDraft.findUnique({
            where: { id: draftId },
            include: {
                connectedAccount: { include: { integration: { include: { token: true } } } },
                assets: true
            }
        })

        if (!draft || !draft.connectedAccount) throw new Error('Draft or connected account not found')
        const { integration } = draft.connectedAccount
        if (!integration.token) throw new Error('Integration token not found')

        const adapter = AdapterFactory.getAdapter(draft.platform)
        const accessToken = decrypt(integration.token.accessTokenEncrypted, ENCRYPTION_KEY)

        try {
            const result = await adapter.publishFromDraft(
                accessToken,
                draft.connectedAccount.providerAccountId,
                {
                    name: draft.name,
                    objective: draft.objective || undefined,
                    budgetType: draft.budgetType,
                    budgetAmount: Number(draft.budgetAmount),
                    primaryText: draft.primaryText || undefined,
                    headline: draft.headline || undefined,
                    description: draft.description || undefined,
                    cta: draft.cta || undefined,
                    destinationUrl: draft.destinationUrl || undefined,
                    providerPageId: (draft as any).providerPageId || undefined,
                    providerWhatsAppNumber: (draft as any).providerWhatsAppNumber || undefined,
                    pixelId: (draft as any).pixelId || undefined,
                    welcomeMessage: (draft as any).welcomeMessage || undefined,
                    providerPostId: (draft as any).providerPostId || undefined,
                    assets: draft.assets.map(a => ({ type: a.type, storageUrl: a.storageUrl }))
                }
            )

            // Save Remote Mapping
            await prisma.adRemoteMapping.create({
                data: {
                    draftId,
                    providerCampaignId: result.providerCampaignId,
                    providerGroupId: result.providerGroupId,
                    providerAdId: result.providerAdId,
                    remoteStatus: 'ACTIVE',
                    publishedAt: new Date()
                }
            })

            await prisma.adDraft.update({
                where: { id: draftId },
                data: { status: 'PUBLISHED' }
            })

            return result
        } catch (error: any) {
            console.error(`[AdsService] Error publishing draft ${draftId}:`, error)
            await prisma.adDraft.update({
                where: { id: draftId },
                data: { status: 'FAILED', validationErrors: { message: error.message } }
            })
            throw error
        }
    }

    /**
     * Sychronizes metrics for all active mappings.
     */
    static async syncAllMetrics() {
        const mappings = await prisma.adRemoteMapping.findMany({
            where: { remoteStatus: 'ACTIVE' },
            include: {
                draft: {
                    include: {
                        connectedAccount: {
                            include: {
                                integration: {
                                    include: { token: true }
                                }
                            }
                        }
                    }
                }
            }
        })

        console.log(`[AdsService] Starting metrics sync for ${mappings.length} campaigns.`)

        for (const mapping of mappings) {
            const integration = mapping.draft.connectedAccount?.integration
            if (!integration?.token) continue

            const adapter = AdapterFactory.getAdapter(mapping.draft.platform)
            const accessToken = decrypt(integration.token.accessTokenEncrypted, ENCRYPTION_KEY)

            try {
                const to = new Date()
                const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days

                const metrics = await adapter.fetchDailyMetrics(
                    accessToken,
                    mapping.draft.connectedAccount!.providerAccountId,
                    from,
                    to
                )

                for (const m of metrics) {
                    await prisma.adMetricsDaily.upsert({
                        where: {
                            date_platform_providerCampaignId: {
                                date: m.date,
                                platform: mapping.draft.platform,
                                providerCampaignId: m.providerCampaignId
                            }
                        },
                        create: {
                            date: m.date,
                            platform: mapping.draft.platform,
                            providerCampaignId: m.providerCampaignId,
                            spend: m.spend,
                            impressions: m.impressions,
                            clicks: m.clicks,
                            conversions: m.conversions
                        },
                        update: {
                            spend: m.spend,
                            impressions: m.impressions,
                            clicks: m.clicks,
                            conversions: m.conversions
                        }
                    })
                }
            } catch (err) {
                console.error(`[AdsService] Failed sync metrics for campaign ${mapping.providerCampaignId}:`, err)
            }
        }
    }

    /**
     * Refreshes access tokens if needed.
     */
    static async refreshIntegrationToken(integrationId: string) {
        const integration = await prisma.adIntegration.findUnique({
            where: { id: integrationId },
            include: { token: true }
        })

        if (!integration?.token?.refreshTokenEncrypted) return

        const adapter = AdapterFactory.getAdapter(integration.platform)
        const refreshToken = decrypt(integration.token.refreshTokenEncrypted, ENCRYPTION_KEY)

        try {
            const newTokens = await adapter.refreshToken(refreshToken)

            await prisma.adOAuthToken.update({
                where: { integrationId },
                data: {
                    accessTokenEncrypted: encrypt(newTokens.accessToken, ENCRYPTION_KEY),
                    expiresAt: newTokens.expiresAt,
                    rotatedAt: new Date()
                }
            })
        } catch (error) {
            await prisma.adIntegration.update({
                where: { id: integrationId },
                data: { status: 'NEEDS_RECONNECT' }
            })
        }
    }
}
