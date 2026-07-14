export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AdPlatform } from '@prisma/client'
import { supabaseAdmin } from '@/lib/supabase'
import { decrypt } from '@/lib/ads/encryption'
import { AdapterFactory } from '@/lib/ads/factory'

const AD_BUCKET = 'ad-creatives'
const ENC_KEY = process.env.ADS_ENCRYPTION_KEY

export async function GET(_req: Request, { params }: { params: { id: string } }) {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const campaign = await (prisma as any).adCampaignV2.findFirst({
        where: { id: params.id, userId: user.id },
        include: {
            brief: true,
            strategy: true,
            creatives: { orderBy: { slotIndex: 'asc' } }
        }
    })
    if (!campaign) return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 })

    return NextResponse.json({ campaign })
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const campaign = await (prisma as any).adCampaignV2.findFirst({
        where: { id: params.id, userId: user.id },
        include: { strategy: true }
    })
    if (!campaign) return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 })

    const body = await req.json()
    const {
        name, providerAccountId, providerAccountName,
        dailyBudgetUSD, locations,
        pageId, whatsappNumber, welcomeMessage, pixelId, destinationUrl
    } = body

    // Auto-upsert AdConnectedAccount from live providerAccountId
    let connectedAccountId: string | null = campaign.connectedAccountId ?? null
    if (providerAccountId) {
        const integration = await prisma.adIntegration.findUnique({
            where: { userId_platform: { userId: user.id, platform: campaign.platform as AdPlatform } }
        })
        if (integration) {
            const connectedAccount = await prisma.adConnectedAccount.upsert({
                where: { integrationId: integration.id },
                create: {
                    integrationId: integration.id,
                    providerAccountId: String(providerAccountId),
                    displayName: providerAccountName || String(providerAccountId)
                },
                update: {
                    providerAccountId: String(providerAccountId),
                    displayName: providerAccountName || String(providerAccountId)
                }
            })
            connectedAccountId = connectedAccount.id
        }
    }

    const updated = await (prisma as any).adCampaignV2.update({
        where: { id: params.id },
        data: {
            ...(name !== undefined && { name: name.trim() }),
            ...(dailyBudgetUSD !== undefined && { dailyBudgetUSD: parseFloat(dailyBudgetUSD) }),
            ...(locations !== undefined && { locations }),
            ...(connectedAccountId !== null && { connectedAccountId }),
            ...(pageId !== undefined && { pageId: pageId || null }),
            ...(whatsappNumber !== undefined && { whatsappNumber: whatsappNumber || null }),
            ...(welcomeMessage !== undefined && { welcomeMessage: welcomeMessage || null }),
            ...(pixelId !== undefined && { pixelId: pixelId || null }),
            ...(destinationUrl !== undefined && { destinationUrl: destinationUrl || null }),
        },
        include: { brief: true, strategy: true }
    })

    return NextResponse.json({ campaign: updated })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const campaign = await (prisma as any).adCampaignV2.findFirst({
        where: { id: params.id, userId: user.id },
        include: {
            creatives: true,
            connectedAccount: { include: { integration: { include: { token: true } } } }
        }
    })
    if (!campaign) return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 })

    // Si está publicada en Meta, eliminarla también allá (best-effort: si falla, igual la borramos de la app)
    if (campaign.providerCampaignId && campaign.connectedAccount?.integration?.token && ENC_KEY) {
        try {
            const accessToken = decrypt(campaign.connectedAccount.integration.token.accessTokenEncrypted, ENC_KEY)
            const adapter = AdapterFactory.getAdapter(campaign.platform)
            if (adapter.deleteCampaign) {
                await adapter.deleteCampaign(accessToken, campaign.connectedAccount.providerAccountId, campaign.providerCampaignId)
            } else {
                await adapter.pauseCampaign(accessToken, campaign.connectedAccount.providerAccountId, campaign.providerCampaignId)
            }
        } catch (err: any) {
            console.error('[DeleteCampaign] No se pudo eliminar en Meta:', err?.message)
        }
    }

    // Delete media files from Supabase storage
    const marker = `/object/public/${AD_BUCKET}/`
    const paths = (campaign.creatives as any[])
        .map((c: any) => c.mediaUrl)
        .filter(Boolean)
        .map((url: string) => {
            const idx = url.indexOf(marker)
            return idx !== -1 ? url.slice(idx + marker.length).split('?')[0] : null
        })
        .filter(Boolean) as string[]
    if (paths.length > 0) {
        try { await supabaseAdmin.storage.from(AD_BUCKET).remove(paths) } catch {}
    }

    await (prisma as any).adCampaignV2.delete({ where: { id: params.id } })

    return NextResponse.json({ ok: true })
}
