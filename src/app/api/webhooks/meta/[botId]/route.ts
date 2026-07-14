export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { MetaBotEngine } from '@/lib/meta-engine'

/** GET – Meta webhook verification challenge */
export async function GET(
  req: NextRequest,
  { params }: { params: { botId: string } },
) {
  const { searchParams } = new URL(req.url)
  const mode      = searchParams.get('hub.mode')
  const token     = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode !== 'subscribe' || !token || !challenge) {
    return new NextResponse('Bad Request', { status: 400 })
  }

  // Verify against the bot's webhookToken
  const bot = await prisma.bot.findFirst({
    where: { id: params.botId, type: 'META' },
    select: { webhookToken: true },
  })

  if (!bot || bot.webhookToken !== token) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  return new NextResponse(challenge, { status: 200 })
}

/** POST – receive Messenger messages */
export async function POST(
  req: NextRequest,
  { params }: { params: { botId: string } },
) {
  try {
    const body = await req.json() as Record<string, unknown>

    if (body.object !== 'page') {
      return NextResponse.json({ ok: true })
    }

    const entries = (body.entry as Array<Record<string, unknown>>) ?? []
    for (const entry of entries) {
      const messaging = (entry.messaging as Array<Record<string, unknown>>) ?? []
      for (const event of messaging) {
        // Only handle message events (ignore deliveries, reads, etc.)
        if (!event.message) continue
        const msg = event.message as Record<string, unknown>
        // Ignore echo messages sent by the page itself
        if (msg.is_echo) continue

        // Process async (don't await — respond 200 immediately to Meta)
        MetaBotEngine.handleEvent(params.botId, event).catch(e =>
          console.error('[META] handleEvent error:', e),
        )
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[META] webhook POST error:', e)
    return NextResponse.json({ ok: true }) // always 200 to Meta
  }
}
