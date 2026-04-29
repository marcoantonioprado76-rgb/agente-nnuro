export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { MetaBotEngine } from '@/lib/meta-engine'

export async function GET(req: NextRequest, { params }: { params: { botId: string } }) {
  const { searchParams } = new URL(req.url)
  const mode      = searchParams.get('hub.mode')
  const token     = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')
  if (mode !== 'subscribe' || !token || !challenge) return new NextResponse('Bad Request', { status: 400 })

  const bot = await (prisma as any).bot.findFirst({
    where: { id: params.botId, type: 'META' },
    select: { webhook_token: true },
  })
  if (!bot || bot.webhook_token !== token) return new NextResponse('Forbidden', { status: 403 })
  return new NextResponse(challenge, { status: 200 })
}

export async function POST(req: NextRequest, { params }: { params: { botId: string } }) {
  try {
    const body = await req.json() as Record<string, unknown>
    if (body.object !== 'page') return NextResponse.json({ ok: true })
    const entries = (body.entry as Array<Record<string, unknown>>) ?? []
    for (const entry of entries) {
      const messaging = (entry.messaging as Array<Record<string, unknown>>) ?? []
      for (const event of messaging) {
        const msg = event.message as Record<string, unknown> | undefined
        if (!msg || (msg as Record<string, unknown>).is_echo) continue
        MetaBotEngine.handleEvent(params.botId, event).catch(e => console.error('[META] error:', e))
      }
    }
    return NextResponse.json({ ok: true })
  } catch { return NextResponse.json({ ok: true }) }
}
