export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { AdPlatform } from '@prisma/client'
import { AdapterFactory } from '@/lib/ads/factory'
import { getAuthUser } from '@/lib/auth'
import { randomUUID } from 'crypto'

export async function POST(
    req: Request,
    { params }: { params: { platform: string } }
) {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const platform = params.platform.toUpperCase() as AdPlatform
    try {
        const adapter = AdapterFactory.getAdapter(platform)
        const state = randomUUID()
        const authUrl = adapter.getAuthUrl(state)
        const response = NextResponse.json({ authUrl })
        response.cookies.set('ads_oauth_state', state, {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            maxAge: 600,
            path: '/',
        })
        return response
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 })
    }
}
