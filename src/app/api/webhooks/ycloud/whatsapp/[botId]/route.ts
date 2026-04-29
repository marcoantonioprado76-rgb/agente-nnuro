export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { BotEngine } from '@/lib/bot-engine'

export async function POST(request: NextRequest, { params }: { params: { botId: string } }) {
  const { botId } = params
  try {
    const token = request.nextUrl.searchParams.get('token')

    const bot = await (prisma as any).bot.findUnique({
      where: { id: botId },
      select: { id: true, status: true, webhook_token: true },
    })

    if (!bot) { console.warn(`[WEBHOOK] Bot desconocido: ${botId}`); return NextResponse.json({ ok: true }) }
    if (token !== bot.webhook_token) { console.warn(`[WEBHOOK] Token inválido para bot ${botId}`); return NextResponse.json({ ok: true }) }
    if (bot.status !== 'ACTIVE') return NextResponse.json({ ok: true })

    const payload = await request.json()
    BotEngine.handleWebhook(botId, payload).catch(err => console.error(`[WEBHOOK] BotEngine error bot ${botId}:`, err))

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(`[WEBHOOK] Error bot ${botId}:`, err)
    return NextResponse.json({ ok: true })
  }
}

export async function GET(request: NextRequest) {
  const challenge = request.nextUrl.searchParams.get('challenge')
  if (challenge) return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } })
  return NextResponse.json({ ok: true })
}
