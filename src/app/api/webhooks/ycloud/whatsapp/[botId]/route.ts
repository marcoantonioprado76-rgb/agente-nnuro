export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { BotEngine } from '@/lib/bot-engine'

/**
 * POST /api/webhooks/ycloud/whatsapp/[botId]?token=WEBHOOK_TOKEN
 *
 * YCloud sends inbound WhatsApp messages here.
 * We always return 200 to prevent YCloud from retrying.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { botId: string } },
) {
  const { botId } = params

  try {
    const token = request.nextUrl.searchParams.get('token')

    const bot = await prisma.bot.findUnique({
      where: { id: botId },
      select: { id: true, status: true, webhookToken: true },
    })

    if (!bot) {
      console.warn(`[WEBHOOK] Unknown botId: ${botId}`)
      return NextResponse.json({ ok: true })
    }

    if (token !== bot.webhookToken) {
      console.warn(`[WEBHOOK] Invalid token for bot ${botId}`)
      return NextResponse.json({ ok: true })
    }

    if (bot.status !== 'ACTIVE') {
      return NextResponse.json({ ok: true })
    }

    const payload = await request.json()

    // Process asynchronously – respond immediately to avoid YCloud timeout
    BotEngine.handleWebhook(botId, payload).catch(err => {
      console.error(`[WEBHOOK] BotEngine error for bot ${botId}:`, err)
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(`[WEBHOOK] Unhandled error for bot ${botId}:`, err)
    return NextResponse.json({ ok: true }) // Always 200
  }
}

/**
 * GET /api/webhooks/ycloud/whatsapp/[botId]
 * Some webhook providers send a GET with ?challenge= for verification.
 */
export async function GET(request: NextRequest) {
  const challenge = request.nextUrl.searchParams.get('challenge')
  if (challenge) {
    return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } })
  }
  return NextResponse.json({ ok: true })
}
