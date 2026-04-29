import { prisma } from './prisma'
import { chatWithUsage, FOLLOWUP_MODEL } from './openai'
import { sendText } from './ycloud'
import { decrypt } from './crypto'
import { resolveOpenAIKey, logAiUsage } from './ai-credits'

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

export async function processFollowUps() {
  const now = new Date()

  const [followUps1, followUps2] = await Promise.all([
    (prisma as any).conversation.findMany({
      where: {
        sold: false,
        bot_disabled: false,
        follow_up1_sent: false,
        follow_up1_at: { lte: now },
        bot: { status: 'ACTIVE' },
      },
      include: { bot: { include: { bot_secrets: true } } },
    }),
    (prisma as any).conversation.findMany({
      where: {
        sold: false,
        bot_disabled: false,
        follow_up2_sent: false,
        follow_up2_at: { lte: now },
        bot: { status: 'ACTIVE' },
      },
      include: { bot: { include: { bot_secrets: true } } },
    }),
  ])

  console.log(`[WORKER] Seguimientos pendientes: 1=${followUps1?.length ?? 0}, 2=${followUps2?.length ?? 0}`)

  for (const conv of followUps1 ?? []) await executeFollowUp(conv, 1)
  for (const conv of followUps2 ?? []) await executeFollowUp(conv, 2)
}

async function executeFollowUp(conv: any, type: 1 | 2) {
  const { id: conversationId, user_phone: userPhone, user_name: userName, bot_id: botId, bot } = conv

  console.log(`[WORKER] Seguimiento ${type} para ${userPhone}`)

  try {
    const resolvedKey = await resolveOpenAIKey(botId)
    if (!resolvedKey) { console.warn(`[WORKER] Sin key de OpenAI para bot ${botId}`); return }

    const messages = await (prisma as any).message.findMany({
      where: { conversation_id: conversationId, buffered: false },
      orderBy: { created_at: 'desc' },
      take: 10,
      select: { role: true, content: true },
    })

    const history = (messages ?? []).reverse().map((m: { role: string; content: string }) => {
      if (m.role === 'assistant') {
        try {
          const p = JSON.parse(m.content)
          return { role: 'assistant' as const, content: [p.mensaje1, p.mensaje2, p.mensaje3].filter(Boolean).join('\n') || m.content }
        } catch { return { role: 'assistant' as const, content: m.content } }
      }
      return { role: m.role as 'user' | 'assistant', content: m.content }
    })

    const delayMinutes = type === 1 ? bot.follow_up1_delay : bot.follow_up2_delay
    const delayText    = delayMinutes >= 1440 ? `${Math.floor(delayMinutes / 1440)} días` : `${delayMinutes} minutos`

    const prompt = `Actúa como el asistente de ventas de "${bot.name}".
El cliente ${userName || 'interesado'} (${userPhone}) escribió hace ${delayText}, la conversación quedó inconclusa.

Historial reciente:
${history.map((h: { role: string; content: string }) => `${h.role}: ${h.content.slice(0, 100)}`).join('\n')}

Genera un mensaje breve, cálido y humano en español para retomar la conversación.

REGLAS:
1. Tono natural, como si escribieras a alguien conocido.
2. No menciones que es un seguimiento ni que eres IA.
3. Máximo 2 frases (40-80 caracteres).

IMPORTANTE: Responde SOLO en JSON:
{"mensaje1": "mensaje aquí"}`

    const aiResult    = await chatWithUsage(prompt, [], resolvedKey.key, FOLLOWUP_MODEL)
    const aiResponse  = aiResult.response
    if (resolvedKey.isGlobal) {
      logAiUsage({ userId: resolvedKey.userId, service: 'follow-up', model: FOLLOWUP_MODEL, promptTokens: aiResult.promptTokens, completionTokens: aiResult.completionTokens }).catch(() => {})
    }

    const messageText = aiResponse.mensaje1 || '¿Hola? ¿Sigues ahí? Queríamos saber si tienes alguna duda 😊'
    const secret      = bot.bot_secrets
    if (!secret?.ycloud_api_key_enc) { console.warn(`[WORKER] Sin YCloud key para bot ${botId}`); return }

    await sendText(secret.whatsapp_instance_number, userPhone.replace(/\D/g, ''), messageText, decrypt(secret.ycloud_api_key_enc))
    await sleep(500)

    if (type === 1) {
      await (prisma as any).conversation.update({ where: { id: conversationId }, data: { follow_up1_sent: true } })
    } else {
      const nextRun = new Date(Date.now() + (bot.follow_up2_delay || 4320) * 60_000)
      await (prisma as any).conversation.update({ where: { id: conversationId }, data: { follow_up2_at: nextRun, follow_up2_sent: false } })
    }

    await (prisma as any).message.create({
      data: { conversation_id: conversationId, role: 'assistant', type: 'text', content: JSON.stringify({ mensaje1: messageText, mensaje2: '', mensaje3: '', fotos_mensaje1: [], reporte: '' }), buffered: false },
    })

    console.log(`[WORKER] Seguimiento ${type} enviado a ${userPhone}`)
  } catch (err) {
    console.error(`[WORKER] Error seguimiento ${type} para ${userPhone}:`, err)
  }
}
