export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/ads/encryption'
import { MetaAdapter } from '@/lib/ads/adapters/meta'

/**
 * GET /api/ads/campaign/[id]/media-status
 * Devuelve el estado de procesamiento en Meta de cada video pre-subido.
 * Para los que están en "processing", consulta a Meta y actualiza la DB
 * (ready/error + thumbnail). La UI hace polling de esto mientras el usuario edita.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
    try {
        const user = await getAuthUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const campaign = await (prisma as any).adCampaignV2.findFirst({
            where: { id: params.id, userId: user.id },
            include: {
                creatives: { orderBy: { slotIndex: 'asc' } },
                connectedAccount: { include: { integration: { include: { token: true } } } },
            },
        })
        if (!campaign) return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 })

        const encKey = process.env.ADS_ENCRYPTION_KEY
        const enc = campaign.connectedAccount?.integration?.token?.accessTokenEncrypted
        let token: string | null = null
        if (enc && encKey) { try { token = decrypt(enc, encKey) } catch { token = null } }
        const adapter = new MetaAdapter()

        const creatives: any[] = campaign.creatives || []
        const items = await Promise.all(creatives.map(async (c) => {
            // Solo consultamos a Meta los que están procesando y tienen token
            if (c.metaVideoId && c.metaMediaStatus === 'processing' && token) {
                try {
                    const { status, thumbnailUrl } = await adapter.getVideoStatus(token, c.metaVideoId)
                    if (status === 'ready' || status === 'error') {
                        await (prisma as any).adCreative.update({
                            where: { id: c.id },
                            data: {
                                metaMediaStatus: status,
                                ...(thumbnailUrl ? { metaThumbnailUrl: thumbnailUrl } : {}),
                            },
                        })
                        c.metaMediaStatus = status
                    }
                } catch { /* dejar como processing y reintentar en el siguiente poll */ }
            }
            return {
                creativeId: c.id,
                slotIndex: c.slotIndex,
                mediaType: c.mediaType,
                metaMediaStatus: c.metaMediaStatus ?? null,
            }
        }))

        return NextResponse.json({ items })
    } catch (err: any) {
        console.error('[media-status]', err)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}
