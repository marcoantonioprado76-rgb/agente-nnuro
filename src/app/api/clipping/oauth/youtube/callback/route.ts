export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { encrypt } from '@/lib/crypto'

function getAuth() {
  const cookieStore = cookies()
  const token = cookieStore.get('auth_token')?.value
  if (!token) return null
  return verifyToken(token)
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mydiamond.com'
  const redirectBase = `${appUrl}/dashboard/services/clipping`

  if (error || !code) {
    return NextResponse.redirect(`${redirectBase}?error=youtube_denied`)
  }

  const auth = getAuth()
  if (!auth) {
    return NextResponse.redirect(`${redirectBase}?error=unauthorized`)
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenRes.ok) {
      console.error('[YouTube OAuth] Token exchange failed:', await tokenRes.text())
      return NextResponse.redirect(`${redirectBase}?error=youtube_token_failed`)
    }

    const tokenData = await tokenRes.json()
    const { access_token, refresh_token, expires_in } = tokenData

    // Get channel info
    const channelRes = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
      { headers: { Authorization: `Bearer ${access_token}` } }
    )

    if (!channelRes.ok) {
      return NextResponse.redirect(`${redirectBase}?error=youtube_channel_failed`)
    }

    const channelData = await channelRes.json()
    const channel = channelData.items?.[0]
    const providerAccountId = channel?.id || 'unknown'
    const displayName = channel?.snippet?.title || 'Mi canal'

    const expiresAt = expires_in
      ? new Date(Date.now() + expires_in * 1000)
      : null

    // Upsert account
    await prisma.clippingAccount.upsert({
      where: { userId_platform: { userId: auth.userId, platform: 'YOUTUBE' } },
      create: {
        userId: auth.userId,
        platform: 'YOUTUBE',
        providerAccountId,
        displayName,
        accessTokenEnc: encrypt(access_token),
        refreshTokenEnc: refresh_token ? encrypt(refresh_token) : null,
        expiresAt,
        status: 'ACTIVE',
      },
      update: {
        providerAccountId,
        displayName,
        accessTokenEnc: encrypt(access_token),
        refreshTokenEnc: refresh_token ? encrypt(refresh_token) : undefined,
        expiresAt,
        status: 'ACTIVE',
      },
    })

    return NextResponse.redirect(`${redirectBase}?connected=youtube`)
  } catch (err) {
    console.error('[YouTube OAuth callback]', err)
    return NextResponse.redirect(`${redirectBase}?error=youtube_internal`)
  }
}
