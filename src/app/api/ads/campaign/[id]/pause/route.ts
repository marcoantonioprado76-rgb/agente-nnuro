export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/ads/encryption'
import { AdapterFactory } from '@/lib/ads/factory'

const ENC_KEY = process.env.ADS_ENCRYPTION_KEY
if (!ENC_KEY) throw new Error('ADS_ENCRYPTION_KEY env var is not set')

export async function POST(_req: Request, { params }: { params: { id: string } }) {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const campaign = await (prisma as any).adCampaignV2.findFirst({
        where: { id: params.id, userId: user.id },
        include: {
            connectedAccount: {
                include: { integration: { include: { token: true } } }
            }
        }
    })

    if (!campaign) return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 })
    if (campaign.status !== 'PUBLISHED') {
        return NextResponse.json({ error: 'Solo se pueden pausar campañas publicadas' }, { status: 400 })
    }
    if (!campaign.providerCampaignId) {
        return NextResponse.json({ error: 'Esta campaña no tiene ID de proveedor' }, { status: 400 })
    }
    if (!campaign.connectedAccount?.integration?.token) {
        return NextResponse.json({ error: 'Reconecta tu cuenta de Meta desde Integraciones' }, { status: 400 })
    }

    try {
        const accessToken = decrypt(campaign.connectedAccount.integration.token.accessTokenEncrypted, ENC_KEY!)
        const adapter = AdapterFactory.getAdapter(campaign.platform)
        await adapter.pauseCampaign(accessToken, campaign.connectedAccount.providerAccountId, campaign.providerCampaignId)

        await (prisma as any).adCampaignV2.update({
            where: { id: params.id },
            data: { status: 'PAUSED' }
        })

        return NextResponse.json({ success: true })
    } catch (err: any) {
        console.error('[PauseCampaign]', err)
        return NextResponse.json({ error: err.message || 'Error al pausar la campaña' }, { status: 500 })
    }
}
