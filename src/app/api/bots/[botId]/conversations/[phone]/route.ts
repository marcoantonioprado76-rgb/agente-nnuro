export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/crypto'
import { sendText } from '@/lib/ycloud'
import { sendWaText } from '@/lib/whatsapp-cloud'
import { BaileysManager } from '@/lib/baileys-manager'
import { createUserNotification } from '@/lib/notifications'

type Ctx = { params: { botId: string; phone: string } }

async function getBotAndConv(botId: string, phone: string, tenantId: string) {
  const bot = await (prisma as any).bot.findFirst({
    where: { id: botId, tenant_id: tenantId },
    include: { bot_secrets: true },
  })
  if (!bot) return { bot: null, conv: null }
  const decodedPhone = decodeURIComponent(phone)
  const conv = await (prisma as any).conversation.findFirst({
    where: { bot_id: botId, user_phone: decodedPhone },
  })
  return { bot, conv }
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { bot, conv } = await getBotAndConv(params.botId, params.phone, session.sub)
  if (!bot) return NextResponse.json({ error: 'Bot no encontrado' }, { status: 404 })
  if (!conv) return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 })

  const messages = await (prisma as any).message.findMany({
    where: { conversation_id: conv.id, buffered: false },
    orderBy: { created_at: 'asc' },
  })
  return NextResponse.json({ conversation: conv, messages: messages ?? [] })
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { bot, conv } = await getBotAndConv(params.botId, params.phone, session.sub)
  if (!bot || !conv) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  await (prisma as any).message.deleteMany({ where: { conversation_id: conv.id } })
  await (prisma as any).botState.upsert({
    where:  { conversation_id: conv.id },
    create: { conversation_id: conv.id, welcome_sent: false },
    update: { welcome_sent: false, welcome_sent_at: null, last_intent: null },
  })
  await (prisma as any).conversation.update({
    where: { id: conv.id },
    data:  { sold: false, sold_at: null, follow_up1_at: null, follow_up1_sent: false, follow_up2_at: null, follow_up2_sent: false },
  })
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { bot, conv } = await getBotAndConv(params.botId, params.phone, session.sub)
  if (!bot || !conv) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const body   = await req.json().catch(() => ({})) as { botDisabled?: boolean; markAsSold?: boolean; orderReport?: string }
  const secret = bot.bot_secrets

  if (body.markAsSold) {
    const reportText = body.orderReport?.trim() ?? ''
    await (prisma as any).conversation.update({ where: { id: conv.id }, data: { sold: true, sold_at: new Date(), bot_disabled: true } })
    if (reportText && secret?.report_phone) {
      const rPhone = (secret.report_phone as string).replace(/^\+/, '').replace(/\s/g, '')
      try {
        if (bot.type === 'YCLOUD' && secret.ycloud_api_key_enc)
          await sendText(secret.whatsapp_instance_number as string, rPhone, reportText, decrypt(secret.ycloud_api_key_enc as string))
        else if (bot.type === 'BAILEYS')
          await BaileysManager.sendText(bot.id, rPhone, reportText)
        else if (bot.type === 'WHATSAPP_CLOUD' && secret.meta_page_token_enc && secret.meta_phone_number_id)
          await sendWaText(rPhone, reportText, secret.meta_phone_number_id as string, decrypt(secret.meta_page_token_enc as string))
      } catch { /* non-critical */ }
    }
    createUserNotification({ userId: session.sub, type: 'new_sale', title: `📞 Venta manual — ${bot.name}`, message: reportText.slice(0, 120) || 'Venta registrada manualmente', link: '/bots' }).catch(() => {})
    const updated = await (prisma as any).conversation.findUnique({ where: { id: conv.id } })
    return NextResponse.json({ conversation: updated })
  }

  const newVal = typeof body.botDisabled === 'boolean' ? body.botDisabled : !conv.bot_disabled
  const updated = await (prisma as any).conversation.update({ where: { id: conv.id }, data: { bot_disabled: newVal } })
  return NextResponse.json({ conversation: updated })
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { bot, conv } = await getBotAndConv(params.botId, params.phone, session.sub)
  if (!bot || !conv) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const secret = bot.bot_secrets
  if (!secret) return NextResponse.json({ error: 'Bot sin credenciales' }, { status: 400 })
  if (!['YCLOUD', 'WHATSAPP_CLOUD'].includes(bot.type)) return NextResponse.json({ error: 'Envío manual no disponible para este tipo' }, { status: 400 })

  const body = await req.json().catch(() => ({})) as { text?: string }
  const text = body.text?.trim()
  if (!text) return NextResponse.json({ error: 'Texto vacío' }, { status: 400 })

  const to = conv.user_phone.replace(/\D/g, '')
  try {
    if (bot.type === 'YCLOUD')
      await sendText(secret.whatsapp_instance_number as string, to, text, decrypt(secret.ycloud_api_key_enc as string))
    else
      await sendWaText(to, text, secret.meta_phone_number_id as string, decrypt(secret.meta_page_token_enc as string))
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error enviando' }, { status: 502 })
  }

  const msg = await (prisma as any).message.create({
    data: { conversation_id: conv.id, role: 'assistant', type: 'text', content: JSON.stringify({ mensaje1: text, mensaje2: null, mensaje3: null, fotos_mensaje1: [], videos_mensaje1: [], reporte: '' }), buffered: false },
  })
  return NextResponse.json({ message: msg })
}
