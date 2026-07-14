export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { randomUUID } from 'crypto'

export async function GET() {
  const cookieStore = cookies()
  const token = cookieStore.get('auth_token')?.value
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const appId = process.env.META_APP_ID!
  const redirectUri = process.env.META_CLIPPING_REDIRECT_URI!
  const state = randomUUID()

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'pages_show_list,pages_read_engagement',
    state,
  })

  const response = NextResponse.redirect(
    `https://www.facebook.com/v25.0/dialog/oauth?${params.toString()}`
  )

  response.cookies.set('fb_clipping_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })

  return response
}
