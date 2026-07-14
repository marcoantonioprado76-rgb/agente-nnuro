export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { AdPlatform } from '@prisma/client'
import { AdapterFactory } from '@/lib/ads/factory'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/ads/encryption'

const ENCRYPTION_KEY = process.env.ADS_ENCRYPTION_KEY || ''

export async function GET(
    req: Request,
    { params }: { params: { platform: string } }
) {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const pageId = searchParams.get('pageId')
    if (!pageId) return NextResponse.json({ error: 'Missing pageId' }, { status: 400 })

    const platform = params.platform.toUpperCase() as AdPlatform

    const integration = await prisma.adIntegration.findUnique({
        where: { userId_platform: { userId: user.id, platform } },
        include: { token: true }
    })

    if (!integration?.token) {
        return NextResponse.json({ error: 'Platform not connected' }, { status: 400 })
    }

    try {
        const adapter = AdapterFactory.getAdapter(platform)
        const accessToken = decrypt(integration.token.accessTokenEncrypted, ENCRYPTION_KEY)
        const posts = await adapter.listPagePosts(accessToken, pageId)

        return NextResponse.json({ posts })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
