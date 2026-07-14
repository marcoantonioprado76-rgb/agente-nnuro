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

  const clientId = process.env.GOOGLE_CLIENT_ID!
  const redirectUri = process.env.GOOGLE_REDIRECT_URI!

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/youtube.readonly',
    access_type: 'offline',
    prompt: 'consent',
  })

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  )
}
