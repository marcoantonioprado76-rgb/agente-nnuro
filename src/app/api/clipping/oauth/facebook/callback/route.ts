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
  const stateFromUrl = searchParams.get('state')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mydiamond.com'
  const redirectBase = `${appUrl}/dashboard/services/clipping`

  if (error || !code) {
    return NextResponse.redirect(`${redirectBase}?error=facebook_denied`)
  }

  const cookieStore = cookies()
  const stateFromCookie = cookieStore.get('fb_clipping_state')?.value
  if (!stateFromCookie || stateFromUrl !== stateFromCookie) {
    const res = NextResponse.redirect(`${redirectBase}?error=facebook_state_mismatch`)
    res.cookies.delete('fb_clipping_state')
    return res
  }

  const auth = getAuth()
  if (!auth) {
    return NextResponse.redirect(`${redirectBase}?error=unauthorized`)
  }

  try {
    const appId = process.env.META_APP_ID!
    const appSecret = process.env.META_APP_SECRET!
    const redirectUri = process.env.META_CLIPPING_REDIRECT_URI!

    // Exchange code for short-lived token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v25.0/oauth/access_token?` +
      new URLSearchParams({ client_id: appId, client_secret: appSecret, redirect_uri: redirectUri, code })
    )

    if (!tokenRes.ok) {
      console.error('[Facebook OAuth] Token exchange failed:', await tokenRes.text())
      return NextResponse.redirect(`${redirectBase}?error=facebook_token_failed`)
    }

    const tokenData = await tokenRes.json()
    const shortToken = tokenData.access_token

    if (!shortToken) {
      return NextResponse.redirect(`${redirectBase}?error=facebook_no_token`)
    }

    // Exchange for long-lived token (60 days)
    const longRes = await fetch(
      `https://graph.facebook.com/v25.0/oauth/access_token?` +
      new URLSearchParams({
        grant_type: 'fb_exchange_token',
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: shortToken,
      })
    )

    const longData = longRes.ok ? await longRes.json() : null
    const accessToken = longData?.access_token || shortToken
    const expiresIn = longData?.expires_in || tokenData.expires_in || null

    // Get user info
    const meRes = await fetch(
      `https://graph.facebook.com/v25.0/me?fields=id,name&access_token=${accessToken}`
    )
    const meData = meRes.ok ? await meRes.json() : {}
    const displayName = meData.name || 'Mi cuenta Facebook'
    const providerAccountId = meData.id || 'unknown'

    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null

    await prisma.clippingAccount.upsert({
      where: { userId_platform: { userId: auth.userId, platform: 'FACEBOOK' } },
      create: {
        userId: auth.userId,
        platform: 'FACEBOOK',
        providerAccountId,
        displayName,
        accessTokenEnc: encrypt(accessToken),
        expiresAt,
        status: 'ACTIVE',
      },
      update: {
        providerAccountId,
        displayName,
        accessTokenEnc: encrypt(accessToken),
        expiresAt,
        status: 'ACTIVE',
      },
    })

    const response = NextResponse.redirect(`${redirectBase}?connected=facebook`)
    response.cookies.delete('fb_clipping_state')
    return response
  } catch (err) {
    console.error('[Facebook OAuth callback]', err)
    return NextResponse.redirect(`${redirectBase}?error=facebook_internal`)
  }
}
