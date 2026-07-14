export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/ads/encryption'

const META_APP_ID = process.env.META_APP_ID || ''
const META_APP_SECRET = process.env.META_APP_SECRET || ''
const ENCRYPTION_KEY = process.env.ADS_ENCRYPTION_KEY || ''

export async function POST(req: Request) {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { accessToken } = await req.json()
    if (!accessToken) return NextResponse.json({ error: 'No access token provided' }, { status: 400 })

    try {
        // Exchange short-lived JS SDK token for long-lived token (60 days)
        const params = new URLSearchParams({
            grant_type: 'fb_exchange_token',
            client_id: META_APP_ID,
            client_secret: META_APP_SECRET,
            fb_exchange_token: accessToken
        })

        const res = await fetch(`https://graph.facebook.com/v21.0/oauth/access_token?${params}`)
        const data = await res.json()

        if (data.error) {
            throw new Error(data.error.error_user_msg || data.error.message)
        }

        const longLivedToken = data.access_token
        const expiresAt = data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined

        // Store integration
        const integration = await prisma.adIntegration.upsert({
            where: { userId_platform: { userId: user.id, platform: 'META' } },
            create: {
                userId: user.id,
                platform: 'META',
                status: 'CONNECTED',
                scopes: ['ads_management', 'ads_read', 'business_management', 'pages_show_list',
                    'pages_read_engagement', 'pages_manage_ads', 'pages_manage_metadata', 'public_profile']
            },
            update: { status: 'CONNECTED' }
        })

        // Store token
        await prisma.adOAuthToken.upsert({
            where: { integrationId: integration.id },
            create: {
                integrationId: integration.id,
                accessTokenEncrypted: encrypt(longLivedToken, ENCRYPTION_KEY),
                refreshTokenEncrypted: null,
                expiresAt: expiresAt ?? null,
                tokenType: 'bearer'
            },
            update: {
                accessTokenEncrypted: encrypt(longLivedToken, ENCRYPTION_KEY),
                refreshTokenEncrypted: null,
                expiresAt: expiresAt ?? null,
                tokenType: 'bearer'
            }
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('[Meta] Token exchange error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
