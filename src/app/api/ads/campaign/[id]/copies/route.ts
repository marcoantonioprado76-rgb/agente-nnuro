export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/ads/encryption'
import { generateAdCopies } from '@/lib/ads/openai-ads'
import { resolveAdsKey, logAiUsage } from '@/lib/ai-credits'

const ENC_KEY = process.env.ADS_ENCRYPTION_KEY
if (!ENC_KEY) throw new Error('ADS_ENCRYPTION_KEY env var is not set')

export async function POST(req: Request, { params }: { params: { id: string } }) {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const oaiConfig = await (prisma as any).openAIConfig.findUnique({ where: { userId: user.id } })
    const resolvedKey = await resolveAdsKey(user.id)
    if (!resolvedKey) {
        return NextResponse.json({ error: 'Configura tu OpenAI API Key en Configuración → IA, o compra créditos de IA.' }, { status: 400 })
    }
    const apiKey = resolvedKey.key
    const model = oaiConfig?.model || 'gpt-4o'

    const campaign = await (prisma as any).adCampaignV2.findFirst({
        where: { id: params.id, userId: user.id },
        include: {
            brief: true,
            strategy: true
        }
    })
    if (!campaign) return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 })

    // Fusionar los campos nuevos del brief (ai_data) → hooks por rubro + beneficios en el copy.
    if (campaign.brief?.id) {
        try {
            const rows: any[] = await prisma.$queryRawUnsafe(
                'SELECT category, ai_data FROM business_briefs WHERE id = $1::uuid LIMIT 1', campaign.brief.id,
            )
            if (rows?.[0]) {
                if (rows[0].category) campaign.brief.category = rows[0].category
                let ai = rows[0].ai_data
                if (typeof ai === 'string') { try { ai = JSON.parse(ai) } catch { ai = null } }
                if (ai && typeof ai === 'object' && !Array.isArray(ai)) Object.assign(campaign.brief, ai)
            }
        } catch (e) { console.warn('[Copies] ai_data:', e instanceof Error ? e.message : e) }
    }

    try {
        const copies = await generateAdCopies({
            brief: {
                name: campaign.brief.name,
                industry: campaign.brief.industry,
                description: campaign.brief.description,
                valueProposition: campaign.brief.valueProposition,
                painPoints: campaign.brief.painPoints,
                interests: campaign.brief.interests,
                brandVoice: campaign.brief.brandVoice,
                brandColors: campaign.brief.brandColors,
                visualStyle: campaign.brief.visualStyle,
                primaryObjective: campaign.brief.primaryObjective,
                mainCTA: campaign.brief.mainCTA,
                targetLocations: campaign.brief.targetLocations,
                keyMessages: campaign.brief.keyMessages,
                personalityTraits: campaign.brief.personalityTraits,
                contentThemes: campaign.brief.contentThemes,
                engagementLevel: campaign.brief.engagementLevel || 'medio',
                // Datos nuevos → hooks por rubro + beneficios
                category: campaign.brief.category,
                benefits: campaign.brief.benefits,
                targetCustomer: campaign.brief.targetCustomer,
                transformation: campaign.brief.transformation,
            } as any,
            strategyName: campaign.strategyName ?? campaign.strategy?.name,
            platform: campaign.platform,
            objective: campaign.objective ?? campaign.strategy?.objective,
            destination: campaign.destination ?? campaign.strategy?.destination,
            mediaType: campaign.mediaType ?? campaign.strategy?.mediaType,
            count: campaign.mediaCount ?? campaign.strategy?.mediaCount,
            apiKey,
            model,
            onUsage: (p, c) => { if (resolvedKey.isGlobal) logAiUsage({ userId: user.id, service: 'ads-copies', model, promptTokens: p, completionTokens: c }).catch(() => {}) },
        })

        // Upsert by slotIndex: update existing records (preserving uploaded mediaUrl/mediaType)
        // or create new ones if slot doesn't exist yet. This avoids duplicate records.
        const existing = await (prisma as any).adCreative.findMany({
            where: { campaignId: params.id },
            orderBy: { slotIndex: 'asc' }
        })
        const existingBySlot = new Map<number, any>(existing.map((c: any) => [c.slotIndex, c]))

        await Promise.all(copies.map(async (c: any) => {
            // Auto-append hashtags at the end of primaryText so they appear inline
            const hashtags = (c.hashtags || '').trim()
            const baseText = (c.primaryText || '').trim()
            const primaryText = baseText && hashtags
                ? `${baseText}\n\n${hashtags}`
                : baseText || hashtags || ''

            const existingCreative = existingBySlot.get(c.slotIndex)
            if (existingCreative) {
                return (prisma as any).adCreative.update({
                    where: { id: existingCreative.id },
                    data: {
                        primaryText,
                        headline: c.headline || '',
                        description: c.description || '',
                        hook: c.hook || '',
                        hashtags: null,
                        aiGenerated: true,
                        updatedAt: new Date()
                        // mediaUrl and mediaType are NOT touched — uploaded images preserved
                    }
                })
            } else {
                return (prisma as any).adCreative.create({
                    data: {
                        campaignId: params.id,
                        slotIndex: c.slotIndex,
                        primaryText,
                        headline: c.headline || '',
                        description: c.description || '',
                        hook: c.hook || '',
                        hashtags: null,
                        aiGenerated: true,
                        isApproved: false
                    }
                })
            }
        }))

        // Remove stale creatives at slotIndices no longer in the new copies list
        const newSlotIndices = new Set(copies.map((c: any) => c.slotIndex))
        const staleIds = existing
            .filter((c: any) => !newSlotIndices.has(c.slotIndex))
            .map((c: any) => c.id)
        if (staleIds.length > 0) {
            await (prisma as any).adCreative.deleteMany({ where: { id: { in: staleIds } } })
        }

        // Fetch final state
        const saved = await (prisma as any).adCreative.findMany({
            where: { campaignId: params.id },
            orderBy: { slotIndex: 'asc' }
        })

        // Update campaign status to READY if it was DRAFT
        if (campaign.status === 'DRAFT') {
            await (prisma as any).adCampaignV2.update({
                where: { id: params.id },
                data: { status: 'READY' }
            })
        }

        return NextResponse.json({ creatives: saved, count: saved.length })
    } catch (err: any) {
        console.error('[GenerateCopies]', err)
        return NextResponse.json({ error: err.message || 'Error al generar copies' }, { status: 500 })
    }
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const campaign = await (prisma as any).adCampaignV2.findFirst({
        where: { id: params.id, userId: user.id }
    })
    if (!campaign) return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 })

    const creatives = await (prisma as any).adCreative.findMany({
        where: { campaignId: params.id },
        orderBy: { slotIndex: 'asc' }
    })

    return NextResponse.json({ creatives })
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { creatives } = await req.json()
    if (!Array.isArray(creatives)) return NextResponse.json({ error: 'creatives array required' }, { status: 400 })

    const campaign = await (prisma as any).adCampaignV2.findFirst({
        where: { id: params.id, userId: user.id }
    })
    if (!campaign) return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 })

    // Update each creative
    const updates = await Promise.all(
        creatives.map((c: any) =>
            (prisma as any).adCreative.update({
                where: { id: c.id },
                data: {
                    primaryText: c.primaryText,
                    headline: c.headline,
                    description: c.description,
                    hook: c.hook,
                    hashtags: c.hashtags ?? null,
                    mediaUrl: c.mediaUrl,
                    mediaType: c.mediaType,
                    isApproved: c.isApproved ?? false,
                    updatedAt: new Date()
                }
            })
        )
    )

    return NextResponse.json({ creatives: updates })
}
