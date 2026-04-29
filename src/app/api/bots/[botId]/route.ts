export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type Ctx = { params: { botId: string } }

async function getOwnedBot(botId: string, userId: string) {
  return (prisma as any).bot.findFirst({ where: { id: botId, tenant_id: userId } })
}

function toNexorBot(b: any) {
  return {
    id: b.id, name: b.name, type: b.type, status: b.status,
    webhookToken: b.webhook_token,
    systemPromptTemplate: b.system_prompt_template,
    maxCharsMensaje1: b.max_chars_msg1,
    maxCharsMensaje2: b.max_chars_msg2,
    maxCharsMensaje3: b.max_chars_msg3,
    baileysPhone: b.baileys_phone,
    followUp1Delay: b.follow_up1_delay,
    followUp2Delay: b.follow_up2_delay,
    aiModel: b.ai_model,
    createdAt: b.created_at,
  }
}

/** GET /api/bots/[botId] */
export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const bot = await getOwnedBot(params.botId, session.sub)
  if (!bot) return NextResponse.json({ error: 'Bot no encontrado' }, { status: 404 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tu-dominio.com'
  const webhookUrl = bot.type === 'META'
    ? `${appUrl}/api/webhooks/meta/${bot.id}`
    : bot.type === 'WHATSAPP_CLOUD'
      ? `${appUrl}/api/webhooks/whatsapp-cloud/${bot.id}`
      : `${appUrl}/api/webhooks/ycloud/whatsapp/${bot.id}?token=${bot.webhook_token}`

  return NextResponse.json({ bot: toNexorBot(bot), webhookUrl })
}

/** PATCH /api/bots/[botId] — actualizar configuración */
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const bot = await getOwnedBot(params.botId, session.sub)
  if (!bot) return NextResponse.json({ error: 'Bot no encontrado' }, { status: 404 })

  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  // Accept both camelCase (nexor page) and snake_case
  const name                 = body.name
  const status               = body.status
  const systemPromptTemplate = body.systemPromptTemplate ?? body.system_prompt_template
  const maxCharsMensaje1     = body.maxCharsMensaje1     ?? body.max_chars_msg1
  const maxCharsMensaje2     = body.maxCharsMensaje2     ?? body.max_chars_msg2
  const maxCharsMensaje3     = body.maxCharsMensaje3     ?? body.max_chars_msg3
  const followUp1Delay       = body.followUp1Delay       ?? body.follow_up1_delay
  const followUp2Delay       = body.followUp2Delay       ?? body.follow_up2_delay
  const aiModel              = body.aiModel              ?? body.ai_model

  const VALID_MODELS = ['gpt-5.2', 'gpt-5.1', 'gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo']
  const updates: Record<string, unknown> = {}

  if (typeof name === 'string' && name.trim())                             updates.name = name.trim()
  if (status === 'ACTIVE' || status === 'PAUSED')                          updates.status = status
  if (typeof systemPromptTemplate === 'string')                            updates.system_prompt_template = systemPromptTemplate
  if (maxCharsMensaje1 === null)                                           updates.max_chars_msg1 = null
  else if (typeof maxCharsMensaje1 === 'number' && maxCharsMensaje1 > 0)  updates.max_chars_msg1 = Math.floor(maxCharsMensaje1)
  if (maxCharsMensaje2 === null)                                           updates.max_chars_msg2 = null
  else if (typeof maxCharsMensaje2 === 'number' && maxCharsMensaje2 > 0)  updates.max_chars_msg2 = Math.floor(maxCharsMensaje2)
  if (maxCharsMensaje3 === null)                                           updates.max_chars_msg3 = null
  else if (typeof maxCharsMensaje3 === 'number' && maxCharsMensaje3 > 0)  updates.max_chars_msg3 = Math.floor(maxCharsMensaje3)
  if (typeof followUp1Delay === 'number')                                  updates.follow_up1_delay = followUp1Delay
  if (typeof followUp2Delay === 'number')                                  updates.follow_up2_delay = followUp2Delay
  if (typeof aiModel === 'string' && VALID_MODELS.includes(aiModel))      updates.ai_model = aiModel

  const updated = await (prisma as any).bot.update({ where: { id: params.botId }, data: updates })
  return NextResponse.json({ bot: toNexorBot(updated) })
}

/** DELETE /api/bots/[botId] */
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const bot = await getOwnedBot(params.botId, session.sub)
  if (!bot) return NextResponse.json({ error: 'Bot no encontrado' }, { status: 404 })

  await (prisma as any).bot.delete({ where: { id: params.botId } })
  return NextResponse.json({ ok: true })
}
