/**
 * Diamond Assistant — Programador de publicaciones a grupos
 *
 * `runDiamondScheduledPosts()` se llama cada minuto desde `instrumentation.ts`.
 * Busca publicaciones cuya hora ya llegó (`scheduledAt <= now`, `status = PENDING`)
 * y las ENVÍA al grupo por el motor Baileys aislado: primero el texto (si hay) y
 * luego cada imagen/video/flyer/pdf, en orden y con throttle anti-baneo.
 *
 * Reglas:
 *   - Solo envía si el agente está ACTIVO y su sesión de grupos está CONECTADA.
 *     Si no, deja la publicación PENDING para reintentar en el próximo tick.
 *   - Recurrencia: NONE → se marca SENT. DAILY/WEEKLY → se reprograma al siguiente
 *     horario futuro (misma hora del día), quedando PENDING.
 *
 * ROBUSTEZ: todo va en try/catch. Un fallo en una publicación NO corta el tick.
 */

import { prisma } from '@/lib/prisma'
import { sendDiamondText, sendDiamondMedia, sendCombinedToGroup, getDiamondStatus } from './diamondBaileys'
import { isMotivationBody, nextMotivationBody } from './motivation'
import { sendAgentText, sendAgentMedia, type SendViaAgent } from './sendVia'

const DAY_MS = 86_400_000
const WEEK_MS = 7 * DAY_MS
const MEDIA_THROTTLE_MS = 1200 // pausa entre adjuntos (anti-baneo)
const PRIVATE_THROTTLE_MS = 2000 // pausa entre privados (anti-baneo, más conservador)

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

// Evita que dos ticks se solapen (un envío lento no debe pisar al siguiente).
let running = false

const WEEKDAY_IDX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

/** Día de la semana (0=domingo … 6=sábado) de un instante EN LA ZONA del agente. */
function weekdayInTz(d: Date, tz: string): number {
  try {
    const wd = new Intl.DateTimeFormat('en-US', { timeZone: tz || 'America/La_Paz', weekday: 'short' }).format(d)
    return WEEKDAY_IDX[wd] ?? d.getUTCDay()
  } catch {
    return d.getUTCDay()
  }
}

/**
 * Siguiente horario futuro para una recurrencia, o null si ya no se repite
 * (repeat=NONE, config inválida, o pasó la fecha de fin `repeatUntil`).
 */
function nextSchedule(
  current: Date,
  repeat: string,
  intervalMinutes: number | null,
  weekdays: number[],
  repeatUntil: Date | null,
  timezone: string,
  now: Date,
): Date | null {
  const withinUntil = (t: number) => !(repeatUntil && t > repeatUntil.getTime())

  // Días específicos de la semana: buscamos el próximo día permitido a la misma hora.
  if (repeat === 'WEEKDAYS') {
    if (!weekdays || weekdays.length === 0) return null
    let t = current.getTime()
    for (let i = 0; i < 370; i++) {
      t += DAY_MS // Bolivia no tiene horario de verano → conserva la hora del día.
      if (t <= now.getTime()) continue
      if (weekdays.includes(weekdayInTz(new Date(t), timezone))) {
        return withinUntil(t) ? new Date(t) : null
      }
    }
    return null
  }

  let step = 0
  if (repeat === 'DAILY') step = DAY_MS
  else if (repeat === 'WEEKLY') step = WEEK_MS
  else if (repeat === 'INTERVAL') step = Math.max(1, intervalMinutes ?? 0) * 60_000
  if (step <= 0) return null

  // Avanzamos hasta dejarlo en el futuro (evita ráfaga si el server estuvo caído).
  let t = current.getTime()
  do {
    t += step
  } while (t <= now.getTime())

  return withinUntil(t) ? new Date(t) : null
}

export async function runDiamondScheduledPosts(): Promise<number> {
  if (running) return 0
  running = true
  let sent = 0
  try {
    const now = new Date()
    const due = await prisma.assistantScheduledPost.findMany({
      where: { status: 'PENDING', scheduledAt: { lte: now } },
      orderBy: { scheduledAt: 'asc' },
      take: 25,
    })
    if (due.length === 0) return 0

    for (const post of due) {
      try {
        // Gate 1: agente activo.
        const agent = await prisma.assistantAgent.findUnique({
          where: { id: post.agentId },
          select: {
            isActive: true, timezone: true,
            provider: true, providerApiKeyEnc: true, providerSender: true,
          },
        })
        if (!agent || !agent.isActive) continue // reintenta luego

        // Gate 2: sesión de grupos conectada (los grupos van SIEMPRE por Baileys).
        if (getDiamondStatus(post.agentId).status !== 'connected') continue // reintenta luego

        // Body efectivo: si es el marcador de MOTIVACIÓN, rota una frase distinta cada vez.
        const effectiveBody = isMotivationBody(post.body) ? await nextMotivationBody() : (post.body ?? '')

        // Envío COMBINADO: la imagen/video va con el texto como pie (en un solo
        // mensaje), igual que la bienvenida — nunca separa una imagen de su descripción.
        const assets = post.mediaAssetIds.length > 0
          ? await prisma.mediaAsset.findMany({
              where: { id: { in: post.mediaAssetIds } },
              select: { id: true, type: true, url: true, linkUrl: true, textContent: true, title: true, caption: true },
            })
          : []
        const byId = new Map(assets.map((a) => [a.id, a]))
        const orderedAssets = post.mediaAssetIds.map((id) => byId.get(id)).filter(Boolean) as typeof assets
        await sendCombinedToGroup(post.agentId, post.groupJid, (effectiveBody ?? '').trim(), orderedAssets, MEDIA_THROTTLE_MS)

        // 2.5) Reenviar al PRIVADO de los contactos tibios (los que ya escribieron),
        //      si la publicación lo pide. Fire-and-forget (no bloquea el resto), con
        //      pausas largas. Es de bajo riesgo (solo a quienes iniciaron contacto).
        if (post.alsoToPrivate) {
          const sendAgent: SendViaAgent = {
            id: post.agentId,
            provider: agent.provider,
            providerApiKeyEnc: agent.providerApiKeyEnc,
            providerSender: agent.providerSender,
          }
          fanOutToWarmPrivates(sendAgent, post.agentId, effectiveBody, post.mediaAssetIds)
            .catch((err) => console.error(`[DIAMOND SCHED] reenvío a privados error (post ${post.id}):`, err))
        }

        // 3) Éxito → marcar SENT o reprogramar si es recurrente.
        const next = nextSchedule(
          post.scheduledAt,
          post.repeat,
          post.intervalMinutes,
          post.weekdays,
          post.repeatUntil,
          agent.timezone,
          now,
        )
        await prisma.assistantScheduledPost.update({
          where: { id: post.id },
          data: next
            ? { scheduledAt: next, lastSentAt: now, sentCount: { increment: 1 } }
            : { status: 'SENT', lastSentAt: now, sentCount: { increment: 1 } },
        })
        sent++
        console.log(
          `[DIAMOND SCHED] Publicación enviada a ${post.groupName ?? post.groupJid} ` +
            `(agente ${post.agentId})${next ? ` — próxima ${next.toISOString()}` : ''}`,
        )
      } catch (err) {
        console.error(`[DIAMOND SCHED] error enviando post ${post.id}:`, err)
        // Se deja PENDING para reintentar en el próximo tick.
      }
    }
  } catch (err) {
    console.error('[DIAMOND SCHED] tick error:', err)
  } finally {
    running = false
  }
  return sent
}

/**
 * Reenvía el mismo contenido (texto + adjuntos) al PRIVADO 1:1 de los contactos
 * "tibios": los que YA le escribieron al agente (tienen memoria como usuario).
 * Bajo riesgo — no toca desconocidos. Envío por el canal del agente (sendVia):
 *   - YCLOUD → mensaje de sesión: WhatsApp solo lo entrega a quienes escribieron
 *     en las últimas 24h; el resto simplemente no se envía (cero baneo).
 *   - BAILEYS → 1:1, con pausas largas (anti-baneo).
 */
async function fanOutToWarmPrivates(
  agent: SendViaAgent,
  agentId: string,
  body: string | null,
  mediaAssetIds: string[],
): Promise<void> {
  // Contactos tibios: teléfonos distintos que ya escribieron (role='user').
  const rows = await prisma.assistantMemory.findMany({
    where: { agentId, role: 'user' },
    distinct: ['contactPhone'],
    select: { contactPhone: true },
  })
  const phones = rows.map((r) => r.contactPhone).filter((p) => p && p.replace(/\D/g, '').length >= 7)
  if (phones.length === 0) return

  // Adjuntos (una sola carga).
  const assets =
    mediaAssetIds.length > 0
      ? await prisma.mediaAsset.findMany({
          where: { id: { in: mediaAssetIds } },
          select: { id: true, type: true, url: true, linkUrl: true, textContent: true, title: true, caption: true },
        })
      : []
  const byId = new Map(assets.map((a) => [a.id, a]))
  const ordered = mediaAssetIds.map((id) => byId.get(id)).filter(Boolean) as typeof assets

  const text = (body ?? '').trim()
  // La imagen/video va con el texto como pie (los dos en uno); igual que en el grupo.
  const carrierIdx = ordered.findIndex((a) => ['IMAGE', 'VIDEO'].includes((a.type || '').toUpperCase()))
  let ok = 0
  for (const phone of phones) {
    try {
      if (carrierIdx < 0) {
        if (text) await sendAgentText(agent, phone, text)
        for (const a of ordered) {
          await sleep(600)
          await sendAgentMedia(agent, phone, { type: a.type, url: a.url, linkUrl: a.linkUrl, textContent: a.textContent, title: a.title, caption: (a.caption ?? '').trim() })
        }
      } else {
        const carrier = ordered[carrierIdx]
        await sendAgentMedia(agent, phone, { type: carrier.type, url: carrier.url, linkUrl: carrier.linkUrl, textContent: carrier.textContent, title: carrier.title, caption: text || (carrier.caption ?? '').trim() })
        for (let i = 0; i < ordered.length; i++) {
          if (i === carrierIdx) continue
          await sleep(600)
          const a = ordered[i]
          await sendAgentMedia(agent, phone, { type: a.type, url: a.url, linkUrl: a.linkUrl, textContent: a.textContent, title: a.title, caption: (a.caption ?? '').trim() })
        }
      }
      ok++
    } catch (err) {
      console.error(`[DIAMOND SCHED] privado a ${phone} falló:`, err)
    }
    await sleep(PRIVATE_THROTTLE_MS) // pausa entre personas (anti-baneo)
  }
  console.log(`[DIAMOND SCHED] Reenvío a privados (tibios): intentados ${ok}/${phones.length}`)
}
