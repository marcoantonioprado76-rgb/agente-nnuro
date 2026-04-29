export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { WhatsAppCloudEngine } from '@/lib/whatsapp-cloud-engine'

export async function GET(req: NextRequest, { params }: { params: { botId: string } }) {
  const { searchParams } = new URL(req.url)
  const mode      = searchParams.get('hub.mode')
  const token     = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')
  if (mode !== 'subscribe' || !token || !challenge) return new NextResponse('Bad Request', { status: 400 })

  const bot = await (prisma as any).bot.findFirst({
    where: { id: params.botId, type: 'WHATSAPP_CLOUD' },
    select: { webhook_token: true },
  })
  if (!bot || bot.webhook_token !== token) return new NextResponse('Forbidden', { status: 403 })
  return new NextResponse(challenge, { status: 200 })
}

export async function POST(req: NextRequest, { params }: { params: { botId: string } }) {
  try {
    const body = await req.json() as Record<string, unknown>
    if (body.object !== 'whatsapp_business_account') return NextResponse.json({ ok: true })
    const entries = (body.entry as Array<Record<string, unknown>>) ?? []
    for (const entry of entries) {
      const changes = (entry.changes as Array<Record<string, unknown>>) ?? []
      for (const change of changes) {
        if (change.field !== 'messages') continue
        const value    = (change.value as Record<string, unknown>) ?? {}
        const messages = (value.messages as Array<Record<string, unknown>>) ?? []
        const contacts = (value.contacts as Array<Record<string, unknown>>) ?? []
        for (const msg of messages) {
          if (!msg.from || !msg.id) continue
          WhatsAppCloudEngine.handleMessage(params.botId, msg, contacts).catch(e => console.error('[WA_CLOUD] error:', e))
        }
      }
    }
    return NextResponse.json({ ok: true })
  } catch { return NextResponse.json({ ok: true }) }
}
