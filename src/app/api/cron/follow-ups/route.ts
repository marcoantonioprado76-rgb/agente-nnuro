export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { processFollowUps } from '@/lib/follow-up-worker'

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  try {
    await processFollowUps()
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[CRON follow-ups]', err)
    return NextResponse.json({ error: 'Error en worker' }, { status: 500 })
  }
}
