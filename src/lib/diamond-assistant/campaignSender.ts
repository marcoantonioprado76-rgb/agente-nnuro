/**
 * Diamond Assistant — Motor REAL de campañas 1:1 a contactos
 *
 *   executeCampaignById(id)  → resuelve destinatarios, ENVÍA de verdad por el canal
 *                              del agente (sendVia), registra cada envío en el
 *                              Historial, actualiza contadores y — si la campaña es
 *                              recurrente — la reprograma al próximo horario.
 *   dispatchDueCampaigns()   → worker (instrumentation, cada minuto): toma las
 *                              campañas APROBADAS cuya hora ya llegó y las ejecuta.
 *
 * Recurrencia (guardada en `recurrenceJson`):
 *   { repeat: 'DAILY'|'WEEKLY'|'WEEKDAYS'|'MONTHLY', weekdays?: number[], repeatUntil?: ISO }
 *   (compat: `{ frequency: 'DAILY'|'WEEKLY'|'MONTHLY' }` de versiones previas.)
 *
 * ROBUSTEZ: todo protegido; un fallo en un destinatario no corta el resto.
 */

import { prisma } from '@/lib/prisma'
import { DiamondCampaignStatus, DiamondContactStatus, DiamondMediaType, DiamondMsgStatus } from '@prisma/client'
import { sendAgentText, sendAgentMedia, sendAgentTemplate, type SendViaAgent, type SendViaAsset } from './sendVia'

// Config de plantilla aprobada guardada en la campaña (para enviar fuera de 24h).
type CampaignTemplate = {
  name: string
  language: string
  params: Array<{ name?: string; source: 'name' | 'fixed'; value?: string }>
}
function parseCampaignTemplate(v: unknown): CampaignTemplate | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  const name = typeof o.name === 'string' ? o.name.trim() : ''
  if (!name) return null
  const language = typeof o.language === 'string' && o.language.trim() ? o.language.trim() : 'es_ES'
  const params = Array.isArray(o.params)
    ? o.params.map((p) => {
        const pp = (p ?? {}) as Record<string, unknown>
        return {
          name: typeof pp.name === 'string' && pp.name ? pp.name : undefined,
          source: pp.source === 'fixed' ? ('fixed' as const) : ('name' as const),
          value: typeof pp.value === 'string' ? pp.value : undefined,
        }
      })
    : []
  return { name, language, params }
}

const DAY_MS = 86_400_000
const WEEK_MS = 7 * DAY_MS
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

const uniq = (arr: unknown[]): string[] =>
  Array.from(new Set(arr.map((v) => String(v).trim()).filter(Boolean)))

const VALID_CONTACT_STATUS = new Set<string>(Object.values(DiamondContactStatus))

const WEEKDAY_IDX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
function weekdayInTz(d: Date, tz: string): number {
  try {
    const wd = new Intl.DateTimeFormat('en-US', { timeZone: tz || 'America/La_Paz', weekday: 'short' }).format(d)
    return WEEKDAY_IDX[wd] ?? d.getUTCDay()
  } catch {
    return d.getUTCDay()
  }
}

/** Destinatarios reales (teléfonos únicos) según targetType/targetJson. */
export async function resolveCampaignRecipients(targetType: string, targetJson: unknown): Promise<string[]> {
  const tj = (targetJson ?? {}) as Record<string, unknown>
  if (targetType === 'MANUAL') return Array.isArray(tj.phones) ? uniq(tj.phones) : []
  if (targetType === 'CONTACT') {
    const phones = Array.isArray(tj.phones) ? tj.phones.map(String) : []
    const contactIds = Array.isArray(tj.contactIds) ? uniq(tj.contactIds) : []
    const out = [...phones]
    if (contactIds.length > 0) {
      const rows = await prisma.contact.findMany({ where: { id: { in: contactIds } }, select: { phone: true } })
      out.push(...rows.map((r) => r.phone))
    }
    return uniq(out)
  }
  if (targetType === 'SEGMENT') {
    const where: Record<string, unknown> = { organizationId: null }
    const tag = typeof tj.tag === 'string' ? tj.tag.trim() : ''
    const status = typeof tj.status === 'string' ? tj.status.trim() : ''
    if (tag) where.tag = tag
    if (status && VALID_CONTACT_STATUS.has(status)) where.status = status as DiamondContactStatus
    const rows = await prisma.contact.findMany({ where, select: { phone: true } })
    return uniq(rows.map((r) => r.phone))
  }
  return []
}

interface CampaignRecurrence {
  repeat: string
  weekdays: number[]
  repeatUntil: Date | null
}

/** Lee la recurrencia desde recurrenceJson (con compat de `frequency`). */
function parseRecurrence(recurring: boolean, recurrenceJson: unknown): CampaignRecurrence | null {
  if (!recurring) return null
  const rj = (recurrenceJson ?? {}) as Record<string, unknown>
  const repeat = (typeof rj.repeat === 'string' && rj.repeat) || (typeof rj.frequency === 'string' && rj.frequency) || 'WEEKLY'
  const weekdays = Array.isArray(rj.weekdays) ? rj.weekdays.map(Number).filter((n) => n >= 0 && n <= 6) : []
  let repeatUntil: Date | null = null
  if (typeof rj.repeatUntil === 'string' && rj.repeatUntil) {
    const d = new Date(rj.repeatUntil)
    if (!isNaN(d.getTime())) repeatUntil = d
  }
  return { repeat: String(repeat).toUpperCase(), weekdays, repeatUntil }
}

/** Próximo horario de una campaña recurrente, o null si ya no se repite. */
function nextCampaignSchedule(current: Date, rec: CampaignRecurrence, tz: string, now: Date): Date | null {
  const within = (t: number) => !(rec.repeatUntil && t > rec.repeatUntil.getTime())

  if (rec.repeat === 'WEEKDAYS') {
    if (rec.weekdays.length === 0) return null
    let t = current.getTime()
    for (let i = 0; i < 370; i++) {
      t += DAY_MS
      if (t <= now.getTime()) continue
      if (rec.weekdays.includes(weekdayInTz(new Date(t), tz))) return within(t) ? new Date(t) : null
    }
    return null
  }
  if (rec.repeat === 'MONTHLY') {
    let d = new Date(current)
    do {
      d = new Date(d)
      d.setMonth(d.getMonth() + 1)
    } while (d.getTime() <= now.getTime())
    return within(d.getTime()) ? d : null
  }
  const step = rec.repeat === 'DAILY' ? DAY_MS : rec.repeat === 'WEEKLY' ? WEEK_MS : 0
  if (step <= 0) return null
  let t = current.getTime()
  do {
    t += step
  } while (t <= now.getTime())
  return within(t) ? new Date(t) : null
}

export interface CampaignRunSummary {
  ok: boolean
  total: number
  sent: number
  failed: number
  error?: string
  rescheduledAt?: string | null
}

/**
 * Ejecuta UNA campaña: envía de verdad a cada destinatario y actualiza estado.
 * No verifica aprobación (el llamador decide cuándo es válido ejecutar).
 */
export async function executeCampaignById(campaignId: string): Promise<CampaignRunSummary> {
  const campaign = await prisma.assistantCampaign.findUnique({ where: { id: campaignId } })
  if (!campaign) return { ok: false, total: 0, sent: 0, failed: 0, error: 'Campaña no encontrada.' }

  const agent = await prisma.assistantAgent.findUnique({
    where: { id: campaign.agentId },
    select: { id: true, provider: true, providerApiKeyEnc: true, providerSender: true, isActive: true, timezone: true },
  })
  if (!agent || !agent.isActive) {
    return { ok: false, total: 0, sent: 0, failed: 0, error: 'El agente está inactivo.' }
  }

  const recipients = await resolveCampaignRecipients(campaign.targetType, campaign.targetJson)
  const now = new Date()

  if (recipients.length === 0) {
    await prisma.assistantCampaign.update({
      where: { id: campaign.id },
      data: { status: DiamondCampaignStatus.SENT, sentCount: 0, failedCount: 0 },
    })
    return { ok: true, total: 0, sent: 0, failed: 0 }
  }

  // Recurso adjunto (si lo hay).
  let asset: SendViaAsset | null = null
  let messageType: DiamondMediaType = DiamondMediaType.TEXT
  if (campaign.mediaAssetId) {
    const m = await prisma.mediaAsset.findUnique({ where: { id: campaign.mediaAssetId } })
    if (m) {
      messageType = m.type
      asset = { type: String(m.type), url: m.url, linkUrl: m.linkUrl, textContent: m.textContent, title: m.title }
    }
  }

  const sendAgent: SendViaAgent = {
    id: agent.id,
    provider: agent.provider,
    providerApiKeyEnc: agent.providerApiKeyEnc,
    providerSender: agent.providerSender,
  }

  await prisma.assistantCampaign.update({
    where: { id: campaign.id },
    data: { status: DiamondCampaignStatus.SENDING, sentCount: 0, failedCount: 0 },
  })

  const throttle = campaign.throttleMs > 0 ? campaign.throttleMs : 0
  const bodyText = (campaign.messageBody ?? '').trim()
  let sent = 0
  let failed = 0

  // ¿Enviar por PLANTILLA aprobada? (permite escribir FUERA de las 24h). Si la
  // campaña tiene templateJson, mandamos la plantilla en vez del texto libre.
  const tpl = parseCampaignTemplate((campaign as { templateJson?: unknown }).templateJson)
  const nameByPhone = new Map<string, string>()
  if (tpl && tpl.params.some((p) => p.source === 'name')) {
    const cs = await prisma.contact.findMany({ where: { phone: { in: recipients } }, select: { phone: true, name: true } })
    for (const c of cs) nameByPhone.set(c.phone, (c.name ?? '').trim())
  }

  for (let i = 0; i < recipients.length; i++) {
    const phone = recipients[i]
    let ok = false
    try {
      if (tpl) {
        // Plantilla aprobada: rellenar variables (nombre del contacto o valor fijo).
        const params = tpl.params.map((p) => ({
          ...(p.name ? { name: p.name } : {}),
          text: p.source === 'name' ? (nameByPhone.get(phone) || p.value || 'amig@') : (p.value || ''),
        }))
        ok = await sendAgentTemplate(sendAgent, phone, tpl.name, tpl.language, params)
      } else {
        const textOk = bodyText ? await sendAgentText(sendAgent, phone, bodyText) : false
        let mediaOk = false
        if (asset) {
          await sleep(400) // pequeño respiro entre texto y adjunto
          mediaOk = await sendAgentMedia(sendAgent, phone, asset)
        }
        ok = textOk || mediaOk
      }
    } catch (err) {
      console.error(`[DIAMOND CAMP] envío fallido a ${phone} (campaña ${campaign.id}):`, err)
      ok = false
    }
    if (ok) sent++
    else failed++

    try {
      await prisma.assistantMessageLog.create({
        data: {
          organizationId: campaign.organizationId ?? null,
          agentId: campaign.agentId,
          campaignId: campaign.id,
          contactPhone: phone,
          direction: 'OUT',
          messageType,
          content: campaign.messageBody,
          mediaAssetId: campaign.mediaAssetId ?? null,
          status: ok ? DiamondMsgStatus.SENT : DiamondMsgStatus.FAILED,
          error: ok ? null : 'Envío no confirmado por el proveedor.',
        },
      })
    } catch (err) {
      console.error(`[DIAMOND CAMP] error guardando log (campaña ${campaign.id}):`, err)
    }

    if (throttle > 0 && i < recipients.length - 1) await sleep(throttle)
  }

  // Recurrencia: reprogramar o cerrar.
  const rec = parseRecurrence(campaign.recurring, campaign.recurrenceJson)
  const base = campaign.scheduledAt ?? now
  const next = rec ? nextCampaignSchedule(base, rec, agent.timezone, now) : null

  if (next) {
    await prisma.assistantCampaign.update({
      where: { id: campaign.id },
      data: { status: DiamondCampaignStatus.SCHEDULED, scheduledAt: next, sentCount: sent, failedCount: failed },
    })
  } else {
    const finalStatus = sent === 0 && failed > 0 ? DiamondCampaignStatus.FAILED : DiamondCampaignStatus.SENT
    await prisma.assistantCampaign.update({
      where: { id: campaign.id },
      data: { status: finalStatus, sentCount: sent, failedCount: failed },
    })
  }

  console.log(
    `[DIAMOND CAMP] Campaña "${campaign.name}" enviada: ${sent} ok / ${failed} fallidas` +
      (next ? ` — próxima ${next.toISOString()}` : ''),
  )
  return { ok: true, total: recipients.length, sent, failed, rescheduledAt: next ? next.toISOString() : null }
}

// Evita solapamiento de ticks del worker.
let running = false

/** Worker: ejecuta las campañas aprobadas cuya hora programada ya llegó. */
export async function dispatchDueCampaigns(): Promise<number> {
  if (running) return 0
  running = true
  let count = 0
  try {
    const now = new Date()
    const due = await prisma.assistantCampaign.findMany({
      where: {
        status: DiamondCampaignStatus.SCHEDULED,
        approvedAt: { not: null },
        scheduledAt: { not: null, lte: now },
      },
      select: { id: true },
      orderBy: { scheduledAt: 'asc' },
      take: 10,
    })
    for (const c of due) {
      try {
        await executeCampaignById(c.id)
        count++
      } catch (err) {
        console.error(`[DIAMOND CAMP] error ejecutando campaña ${c.id}:`, err)
      }
    }
  } catch (err) {
    console.error('[DIAMOND CAMP] tick error:', err)
  } finally {
    running = false
  }
  return count
}
