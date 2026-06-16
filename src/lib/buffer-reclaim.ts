/**
 * Worker de rescate del buffer ("red de seguridad").
 *
 * El camino feliz de cada engine acumula los mensajes entrantes durante 15s
 * (campo `buffered=true`) y luego los procesa. Si el proceso se reinicia o
 * cae durante esa ventana, esos mensajes quedan en la base SIN procesar y el
 * cliente nunca recibe respuesta.
 *
 * Este worker busca periódicamente esos mensajes huérfanos (más viejos que el
 * umbral mínimo, ya fuera de la ventana normal de buffer) y los procesa con la
 * misma función idempotente `processBuffered` del engine correspondiente. El
 * lock compartido (buffer-lock) garantiza que nunca se pise con el camino feliz.
 *
 * Ventana de antigüedad:
 *  - menor a RECLAIM_MIN_AGE  → aún dentro del buffer normal, no se toca.
 *  - entre MIN y MAX          → se rescata (se responde).
 *  - mayor a RECLAIM_MAX_AGE  → demasiado viejo; se marca expirado (buffered=false)
 *                               SIN responder, para no contestar tarde y raro a un
 *                               cliente que escribió hace horas, ni quedar en bucle.
 *
 * No requiere cambios de base de datos: se apoya en `buffered` y `created_at`.
 */

import { prisma } from './prisma'
import { BotEngine } from './bot-engine'
import { WhatsAppCloudEngine } from './whatsapp-cloud-engine'
import { MetaBotEngine } from './meta-engine'

/** Sólo rescatamos mensajes más viejos que esto (muy por encima de los 15s del buffer). */
const RECLAIM_MIN_AGE_MS = 90_000
/**
 * Tope superior: no respondemos a mensajes atascados demasiado viejos.
 * Configurable con DRAIN_MAX_AGE_MIN (minutos; por defecto 60).
 */
const RECLAIM_MAX_AGE_MS = (parseInt(process.env.DRAIN_MAX_AGE_MIN || '60', 10) || 60) * 60_000
/** Máximo de conversaciones a procesar por corrida, para no generar ráfagas. */
const MAX_CONVERSATIONS = 50
/** Tope de reintentos por conversación dentro de la vida del proceso (anti-bucle). */
const MAX_ATTEMPTS = 5

declare global {
  // eslint-disable-next-line no-var
  var __reclaim_attempts: Map<string, number> | undefined
}
const attempts: Map<string, number> = global.__reclaim_attempts ?? (global.__reclaim_attempts = new Map())

export interface ReclaimResult {
  scanned: number
  processed: number
  expired: number
  skipped: number
}

export interface ReclaimOptions {
  /** Si se indica, sólo se consideran conversaciones de ese bot (para pruebas/operación acotada). */
  botId?: string
}

export async function reclaimStuckBuffers(opts: ReclaimOptions = {}): Promise<ReclaimResult> {
  const now = Date.now()
  const minCutoff = new Date(now - RECLAIM_MIN_AGE_MS)
  const maxCutoff = new Date(now - RECLAIM_MAX_AGE_MS)

  // Conversaciones con mensajes de usuario en buffer más viejos que el umbral mínimo.
  const stuck = await (prisma as any).message.findMany({
    where: {
      buffered: true,
      role: 'user',
      created_at: { lt: minCutoff },
      ...(opts.botId ? { conversation: { bot_id: opts.botId } } : {}),
    },
    select: { conversation_id: true },
    distinct: ['conversation_id'],
    take: MAX_CONVERSATIONS,
  })

  if (!stuck?.length) return { scanned: 0, processed: 0, expired: 0, skipped: 0 }

  let processed = 0
  let expired = 0
  let skipped = 0

  for (const row of stuck) {
    const conversationId = row.conversation_id as string

    const conv = await (prisma as any).conversation.findUnique({
      where: { id: conversationId },
      select: { bot_id: true, sold: true, bot_disabled: true, bot: { select: { type: true, status: true } } },
    })
    if (!conv) { skipped++; continue }

    // Conversación cerrada o bot no activo: limpiar el buffer para no reintentar en bucle.
    if (conv.sold || conv.bot_disabled || conv.bot?.status !== 'ACTIVE') {
      await (prisma as any).message.deleteMany({ where: { conversation_id: conversationId, role: 'user', buffered: true } }).catch(() => {})
      attempts.delete(conversationId)
      skipped++
      continue
    }

    // Mensaje demasiado viejo: no respondemos algo tardío; lo marcamos como expirado.
    const oldest = await (prisma as any).message.findFirst({
      where: { conversation_id: conversationId, role: 'user', buffered: true },
      orderBy: { created_at: 'asc' },
      select: { created_at: true },
    })
    if (oldest && new Date(oldest.created_at) < maxCutoff) {
      await (prisma as any).message.updateMany({
        where: { conversation_id: conversationId, role: 'user', buffered: true, created_at: { lt: maxCutoff } },
        data: { buffered: false },
      }).catch(() => {})
      attempts.delete(conversationId)
      expired++
      console.log(`[RECLAIM] conv ${conversationId}: mensaje atascado demasiado viejo, expirado sin responder`)
      continue
    }

    const tries = attempts.get(conversationId) ?? 0
    if (tries >= MAX_ATTEMPTS) {
      console.warn(`[RECLAIM] conv ${conversationId} superó ${MAX_ATTEMPTS} reintentos; se omite esta sesión`)
      skipped++
      continue
    }

    const type = (conv.bot?.type as string) || 'YCLOUD'
    try {
      console.log(`[RECLAIM] Rescatando conv ${conversationId} (bot ${conv.bot_id}, tipo ${type})`)
      if (type === 'YCLOUD') {
        await BotEngine.processBuffered(conv.bot_id, conversationId)
      } else if (type === 'WHATSAPP_CLOUD') {
        await WhatsAppCloudEngine.processBuffered(conv.bot_id, conversationId)
      } else if (type === 'META') {
        await MetaBotEngine.processBuffered(conv.bot_id, conversationId)
      } else {
        // BAILEYS requiere un socket activo en memoria (que el reinicio también tumbó);
        // no se puede rescatar desde aquí. Se omite.
        console.log(`[RECLAIM] Tipo ${type} no soportado por el worker (requiere socket); se omite conv ${conversationId}`)
        skipped++
        continue
      }

      // Si quedó procesado, los mensajes viejos en buffer ya no existen.
      const remaining = await (prisma as any).message.count({
        where: { conversation_id: conversationId, role: 'user', buffered: true, created_at: { lt: minCutoff } },
      })
      if (remaining === 0) {
        attempts.delete(conversationId)
        processed++
      } else {
        // Probablemente el lock estaba tomado (camino feliz en curso): reintentar luego.
        attempts.set(conversationId, tries + 1)
        skipped++
      }
    } catch (err) {
      attempts.set(conversationId, tries + 1)
      skipped++
      console.error(`[RECLAIM] Error rescatando conv ${conversationId}:`, err)
    }
  }

  console.log(`[RECLAIM] scanned=${stuck.length} processed=${processed} expired=${expired} skipped=${skipped}`)
  return { scanned: stuck.length, processed, expired, skipped }
}
