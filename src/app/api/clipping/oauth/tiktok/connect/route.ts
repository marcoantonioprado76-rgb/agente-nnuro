export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'

export async function GET() {
  const cookieStore = cookies()
  const token = cookieStore.get('auth_token')?.value
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY!
  const redirectUri = process.env.TIKTOK_REDIRECT_URI!

  const params = new URLSearchParams({
    client_key: clientKey,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'user.info.basic,video.list',
  })

  return NextResponse.redirect(
    `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`
  )
}
