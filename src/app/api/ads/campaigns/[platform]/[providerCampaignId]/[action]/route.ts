export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AdapterFactory } from '@/lib/ads/factory'
import { decrypt } from '@/lib/ads/encryption'
import { AdPlatform } from '@prisma/client'

const ENCRYPTION_KEY = process.env.ADS_ENCRYPTION_KEY || ''

export async function POST(
    req: Request,
    { params }: { params: { platform: string, providerCampaignId: string, action: string } }
) {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const platform = params.platform.toUpperCase() as AdPlatform
    const { providerCampaignId } = params

    // Extract action from path (pause or resume)
    const action = req.url.endsWith('pause') ? 'pause' : 'resume'

    // Get integration and default account
    const integration = await prisma.adIntegration.findUnique({
        where: { userId_platform: { userId: user.id, platform } },
        include: { token: true, connectedAccount: true }
    })

    if (!integration?.token || !integration.connectedAccount) {
        return NextResponse.json({ error: 'Integration or account not found' }, { status: 404 })
    }

    try {
        const adapter = AdapterFactory.getAdapter(platform)
        const accessToken = decrypt(integration.token.accessTokenEncrypted, ENCRYPTION_KEY)

        let success = false
        if (action === 'pause') {
            success = await adapter.pauseCampaign(accessToken, integration.connectedAccount.providerAccountId, providerCampaignId)
        } else {
            success = await adapter.resumeCampaign(accessToken, integration.connectedAccount.providerAccountId, providerCampaignId)
        }

        if (success) {
            await prisma.adRemoteMapping.updateMany({
                where: { providerCampaignId },
                data: { remoteStatus: action === 'pause' ? 'PAUSED' : 'ACTIVE' }
            })
        }

        return NextResponse.json({ success })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
