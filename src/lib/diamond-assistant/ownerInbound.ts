/**
 * Diamond Assistant — "Modo Dueño": orquestador del turno del dueño.
 *
 * Se llama desde el webhook cuando el que escribe es el DUEÑO. Coordina:
 *   1) APROBACIÓN: si hay una acción pendiente y el dueño dice "aprobado" → la
 *      ejecuta; si dice "no" → la cancela; si dice otra cosa → la descarta y
 *      procesa el mensaje nuevo.
 *   2) CEREBRO ADMIN: corre `runOwnerTurn` para entender y ejecutar el pedido.
 *   3) Responde por WhatsApp y guarda memoria de la conversación.
 *
 * NUNCA lanza (se ejecuta en segundo plano desde el webhook).
 */

import { prisma } from '@/lib/prisma'
import { sendAgentText, sendAgentMedia, splitBubbles, type SendViaAgent } from './sendVia'
import { buildVoiceReply, stripEmotionTags } from './voice'
import { runOwnerTurn } from './ownerEngine'
import {
  getPendingAction,
  resolvePending,
  executePending,
  isAffirmation,
  isNegation,
  type OwnerInboundMedia,
} from './ownerActions'

export type OwnerInboundAgent = SendViaAgent & {
  name: string
  model: string
  voiceEnabled: boolean
  voiceMode: string
  voiceId: string | null
}

// Máximo de caracteres de una respuesta para leerla como nota de voz (listas o
// resúmenes muy largos se dejan solo en texto — no tiene sentido dictarlos).
const VOICE_MAX_CHARS = 600

export async function handleOwnerInbound(params: {
  agent: OwnerInboundAgent
  openaiKey: string
  from: string
  message: string
  attachedMedia: OwnerInboundMedia[]
  /** El dueño mandó una nota de voz → le contestamos también en audio. */
  sentAudio?: boolean
}): Promise<void> {
  const { agent, openaiKey, from, message, attachedMedia, sentAudio = false } = params
  const ownerPhone = (from ?? '').replace(/\D/g, '') || from
  const msg = (message ?? '').trim()

  try {
    // ── 1) ¿Hay una acción esperando aprobación? ──────────────────────────────
    const pending = await getPendingAction(agent.id, ownerPhone)
    if (pending) {
      // Solo un "sí/no" limpio decide; un mensaje con más contenido se trata como
      // pedido nuevo (por eso exigimos que sea corto para contar como confirmación).
      const shortReply = msg.length <= 25
      if (shortReply && isAffirmation(msg)) {
        const text = await executePending(pending)
        await resolvePending(pending.id, 'DONE')
        await reply(agent, from, text, sentAudio)
        await remember(agent.id, ownerPhone, msg || '[archivo]', text)
        return
      }
      if (shortReply && isNegation(msg)) {
        await resolvePending(pending.id, 'CANCELLED')
        const text = 'Listo, lo cancelé. No hice nada. 👍'
        await reply(agent, from, text, sentAudio)
        await remember(agent.id, ownerPhone, msg, text)
        return
      }
      // Otro mensaje → la propuesta anterior queda sin efecto y seguimos con lo nuevo.
      await resolvePending(pending.id, 'CANCELLED')
    }

    // ── 2) Sin pedido entendible (p. ej. solo mandó un archivo sin texto) ──────
    if (!msg && attachedMedia.length === 0) return

    // ── 3) Historial reciente de la charla con el dueño ───────────────────────
    //     Le damos MÁS memoria al dueño (20 turnos) para que entienda el hilo de lo
    //     que le viene pidiendo (referencias tipo "lo que programaste recién").
    const memoryRows = await prisma.assistantMemory.findMany({
      where: { agentId: agent.id, contactPhone: ownerPhone },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { role: true, content: true },
    })
    const history = memoryRows
      .reverse()
      .map((m) => ({ role: (m.role === 'bot' ? 'bot' : 'user') as 'user' | 'bot', content: m.content }))

    // ── 4) Cerebro admin ──────────────────────────────────────────────────────
    const result = await runOwnerTurn({
      agent: { id: agent.id, name: agent.name, model: agent.model, openaiKey },
      ownerPhone,
      attachedMedia,
      history,
      userMessage: msg || '(el dueño mandó un archivo sin texto)',
    })

    await reply(agent, from, result.text, sentAudio)
    await remember(agent.id, ownerPhone, msg || '[archivo]', result.text)
  } catch (err) {
    console.error(`[OWNER] handleOwnerInbound error agentId=${agent.id}:`, err)
    try {
      await sendAgentText(agent, from, 'Uy, tuve un problema con tu pedido. Probá de nuevo en un momento.')
    } catch { /* noop */ }
  }
}

/**
 * Envía la respuesta al dueño.
 *
 * - Si el dueño escribió por TEXTO → responde solo en texto (todas las burbujas).
 * - Si mandó una NOTA DE VOZ → responde MITAD TEXTO, MITAD AUDIO como la CAMILA
 *   normal: la PRIMERA burbuja va como texto corto y el RESTO como nota de voz
 *   (contenido DISTINTO, no repite lo mismo que el texto). Si es una sola burbuja,
 *   va solo como audio (sin duplicar). Listas/resúmenes muy largos NO se dictan
 *   (quedan en texto). Nunca lanza (cada envío está protegido).
 */
async function reply(agent: OwnerInboundAgent, to: string, text: string, sentAudio: boolean): Promise<void> {
  const body = (text ?? '').trim()
  if (!body) return

  const bubbles = splitBubbles(body, 3)
  const multi = bubbles.length >= 2
  const speakPart = multi ? bubbles.slice(1).join('\n\n') : body
  // Solo hablamos si mandó audio y lo que iría por voz no es larguísimo (no dictar listas).
  const wantVoice = sentAudio && speakPart.length <= VOICE_MAX_CHARS

  const sendTextBubble = (t: string) => sendAgentText(agent, to, t)
  const pause = () => new Promise((r) => setTimeout(r, 700))

  // Sin voz → todo como texto.
  if (!wantVoice) {
    for (let i = 0; i < bubbles.length; i++) {
      await sendTextBubble(bubbles[i])
      if (i < bubbles.length - 1) await pause()
    }
    return
  }

  try {
    const voiceUrl = await buildVoiceReply(agent, stripEmotionTags(speakPart), true, agent.id)

    if (multi) {
      // 1ª burbuja = texto corto; el resto = audio complementario.
      await sendTextBubble(bubbles[0])
      await pause()
      const audioOk = voiceUrl ? await sendAgentMedia(agent, to, { type: 'AUDIO', url: voiceUrl }) : false
      if (!audioOk) {
        // Si no salió el audio, mandamos el resto como texto (no se pierde nada).
        for (let i = 1; i < bubbles.length; i++) {
          await sendTextBubble(bubbles[i])
          if (i < bubbles.length - 1) await pause()
        }
      }
    } else {
      // Una sola burbuja → solo audio (sin duplicar con texto). Si falla, texto.
      const audioOk = voiceUrl ? await sendAgentMedia(agent, to, { type: 'AUDIO', url: voiceUrl }) : false
      if (!audioOk) await sendTextBubble(body)
    }
  } catch (err) {
    console.error(`[OWNER] voz para el dueño falló agentId=${agent.id}:`, err)
    for (let i = 0; i < bubbles.length; i++) {
      await sendTextBubble(bubbles[i])
      if (i < bubbles.length - 1) await pause()
    }
  }
}

/** Guarda la vuelta de conversación (user + bot) en la memoria del asistente. */
async function remember(agentId: string, ownerPhone: string, userText: string, botText: string): Promise<void> {
  try {
    await prisma.assistantMemory.createMany({
      data: [
        { agentId, contactPhone: ownerPhone, role: 'user', content: userText },
        ...(botText?.trim() ? [{ agentId, contactPhone: ownerPhone, role: 'bot', content: botText }] : []),
      ],
    })
  } catch (err) {
    console.error(`[OWNER] error guardando memoria agentId=${agentId}:`, err)
  }
}
