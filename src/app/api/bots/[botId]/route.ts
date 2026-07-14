export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { BOT_VOICES } from '@/lib/voices'

const VALID_VOICE_IDS = new Set(BOT_VOICES.map(v => v.id))
const VALID_VOICE_MODES = new Set(['off', 'audio_in', 'always'])

function getAuth() {
  const cookieStore = cookies()
  const token = cookieStore.get('auth_token')?.value
  if (!token) return null
  return verifyToken(token)
}

/** GET /api/bots/[botId] – fetch single bot with webhook info */
export async function GET(
  _request: NextRequest,
  { params }: { params: { botId: string } },
) {
  const auth = getAuth()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const bot = await prisma.bot.findFirst({
    where: { id: params.botId, userId: auth.userId },
    include: {
      secret: {
        select: { whatsappInstanceNumber: true, reportPhone: true },
      },
      _count: { select: { assignedProducts: true, conversations: true } },
    },
  })

  if (!bot) return NextResponse.json({ error: 'Bot no encontrado' }, { status: 404 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tu-dominio.com'
  const webhookUrl = `${appUrl}/api/webhooks/ycloud/whatsapp/${bot.id}?token=${bot.webhookToken}`

  return NextResponse.json({ bot, webhookUrl })
}

/** PATCH /api/bots/[botId] – update bot settings */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { botId: string } },
) {
  try {
    const auth = getAuth()
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const bot = await prisma.bot.findFirst({
      where: { id: params.botId, userId: auth.userId },
    })
    if (!bot) return NextResponse.json({ error: 'Bot no encontrado' }, { status: 404 })

    const body = await request.json().catch(() => ({}))
    const { name, status, systemPromptTemplate, maxCharsMensaje1, maxCharsMensaje2, maxCharsMensaje3, followUp1Delay, followUp2Delay, followUpPrompt, aiModel,
      voiceEnabled, voiceMode, voiceId } =
      body as Record<string, unknown>

    const VALID_MODELS = ['gpt-5.2', 'gpt-5.1', 'gpt-4o', 'gpt-4o-mini']

    const updated = await prisma.bot.update({
      where: { id: params.botId },
      data: {
        ...(typeof name === 'string' && name.trim() ? { name: name.trim() } : {}),
        ...(status === 'ACTIVE' || status === 'PAUSED' ? { status } : {}),
        ...(typeof systemPromptTemplate === 'string' ? { systemPromptTemplate } : {}),
        ...(maxCharsMensaje1 === null ? { maxCharsMensaje1: null }
          : typeof maxCharsMensaje1 === 'number' && maxCharsMensaje1 > 0 ? { maxCharsMensaje1: Math.floor(maxCharsMensaje1) }
          : {}),
        ...(maxCharsMensaje2 === null ? { maxCharsMensaje2: null }
          : typeof maxCharsMensaje2 === 'number' && maxCharsMensaje2 > 0 ? { maxCharsMensaje2: Math.floor(maxCharsMensaje2) }
          : {}),
        ...(maxCharsMensaje3 === null ? { maxCharsMensaje3: null }
          : typeof maxCharsMensaje3 === 'number' && maxCharsMensaje3 > 0 ? { maxCharsMensaje3: Math.floor(maxCharsMensaje3) }
          : {}),
        ...(typeof followUp1Delay === 'number' ? { followUp1Delay } : {}),
        ...(typeof followUp2Delay === 'number' ? { followUp2Delay } : {}),
        ...(followUpPrompt === null ? { followUpPrompt: null }
          : typeof followUpPrompt === 'string' ? { followUpPrompt: followUpPrompt.trim() || null }
          : {}),
        ...(typeof aiModel === 'string' && VALID_MODELS.includes(aiModel) ? { aiModel } : {}),
        // Nota de voz (TTS)
        ...(typeof voiceEnabled === 'boolean' ? { voiceEnabled } : {}),
        ...(typeof voiceMode === 'string' && VALID_VOICE_MODES.has(voiceMode) ? { voiceMode } : {}),
        ...(voiceId === null ? { voiceId: null }
          : typeof voiceId === 'string' && VALID_VOICE_IDS.has(voiceId) ? { voiceId }
          : {}),
      },
    })

    // Al REACTIVAR un bot Baileys, revivir su conexión YA — sin esperar al
    // healthcheck de 5 min de instrumentation.ts (evita la ventana "ACTIVE pero mudo").
    if (status === 'ACTIVE' && updated.type === 'BAILEYS' && updated.baileysPhone) {
      ;(async () => {
        try {
          const { BaileysManager } = await import('@/lib/baileys-manager')
          const cur = BaileysManager.getStatus(params.botId)
          if (cur.status === 'connected' || cur.status === 'connecting' || cur.status === 'qr_ready') return
          const secret = await prisma.botSecret.findUnique({ where: { botId: params.botId } })
          if (!secret) return
          const { decrypt } = await import('@/lib/crypto')
          let key = ''
          if (secret.openaiApiKeyEnc) { try { key = decrypt(secret.openaiApiKeyEnc) } catch { key = '' } }
          BaileysManager.connect(params.botId, updated.name, key, secret.reportPhone ?? '')
            .catch((e: unknown) => console.error('[PATCH bot] reconnect error:', e))
        } catch (e) {
          console.error('[PATCH bot] reactivate reconnect error:', e)
        }
      })()
    }

    return NextResponse.json({ bot: updated })
  } catch (err: any) {
    console.error('[PATCH /api/bots/[botId]]', err)
    return NextResponse.json({ error: err?.message || 'Error al actualizar el bot' }, { status: 500 })
  }
}

/** DELETE /api/bots/[botId] – remove bot and all related data */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { botId: string } },
) {
  const auth = getAuth()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const bot = await prisma.bot.findFirst({
    where: { id: params.botId, userId: auth.userId },
  })
  if (!bot) return NextResponse.json({ error: 'Bot no encontrado' }, { status: 404 })

  await prisma.bot.delete({ where: { id: params.botId } })

  return NextResponse.json({ ok: true })
}
