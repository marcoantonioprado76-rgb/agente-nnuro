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
    return NextResponse.redirect(`${redirectBase}?error=tiktok_denied`)
  }

  const auth = getAuth()
  if (!auth) {
    return NextResponse.redirect(`${redirectBase}?error=unauthorized`)
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY!,
        client_secret: process.env.TIKTOK_CLIENT_SECRET!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.TIKTOK_REDIRECT_URI!,
      }),
    })

    if (!tokenRes.ok) {
      console.error('[TikTok OAuth] Token exchange failed:', await tokenRes.text())
      return NextResponse.redirect(`${redirectBase}?error=tiktok_token_failed`)
    }

    const tokenData = await tokenRes.json()
    const { access_token, refresh_token, expires_in, open_id } = tokenData

    if (!access_token) {
      return NextResponse.redirect(`${redirectBase}?error=tiktok_no_token`)
    }

    // Get user info
    const userRes = await fetch(
      'https://open.tiktokapis.com/v2/user/info/?fields=display_name,avatar_url',
      { headers: { Authorization: `Bearer ${access_token}` } }
    )

    let displayName = 'Mi cuenta TikTok'
    if (userRes.ok) {
      const userData = await userRes.json()
      displayName = userData.data?.user?.display_name || displayName
    }

    const expiresAt = expires_in
      ? new Date(Date.now() + expires_in * 1000)
      : null

    await prisma.clippingAccount.upsert({
      where: { userId_platform: { userId: auth.userId, platform: 'TIKTOK' } },
      create: {
        userId: auth.userId,
        platform: 'TIKTOK',
        providerAccountId: open_id || 'unknown',
        displayName,
        accessTokenEnc: encrypt(access_token),
        refreshTokenEnc: refresh_token ? encrypt(refresh_token) : null,
        expiresAt,
        status: 'ACTIVE',
      },
      update: {
        providerAccountId: open_id || 'unknown',
        displayName,
        accessTokenEnc: encrypt(access_token),
        refreshTokenEnc: refresh_token ? encrypt(refresh_token) : undefined,
        expiresAt,
        status: 'ACTIVE',
      },
    })

    return NextResponse.redirect(`${redirectBase}?connected=tiktok`)
  } catch (err) {
    console.error('[TikTok OAuth callback]', err)
    return NextResponse.redirect(`${redirectBase}?error=tiktok_internal`)
  }
}
