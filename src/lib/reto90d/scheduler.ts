// ─────────────────────────────────────────────────────────────────────────────
// Reto 90D — Scheduler compartido (recordatorios + reporte final)
// Lo usan TANTO el worker in-process (instrumentation.ts, cada 60s) COMO los
// endpoints /api/cron/reto-90d/* (respaldo manual). Auto-detectan la ventana
// horaria y son idempotentes, así que se pueden llamar muchas veces sin duplicar.
// ─────────────────────────────────────────────────────────────────────────────
import { prisma } from '@/lib/prisma'
import { getActiveChallenge } from './challengeService'
import { listMembers } from './memberService'
import { getActiveTasksForToday } from './taskService'
import { getPendingTasksForUser, getDaySubmissions, getRangeStats } from './submissionService'
import { type ReminderKind } from './reminderService'
import {
  generateDailyUserReport,
  generateAdminDailyReport,
  generateGroupReport,
} from './reportService'
import { getOptedInPhones } from './conversationService'
import {
  generateReminder, generateProgressMessage, generateReengagement, generateGraduation,
  type TaskStatusLite,
} from '@/lib/ai/retoAssistant'
import {
  sendToPhone, sendToAdmin, sendToGroup, sendCoachVoiceOrText,
  getRetoInstructions, getEffectiveOpenAIKey,
} from '@/lib/whatsapp/reto90dSender'
import {
  getStreak, getMemberPosition, getInactivity, getGlobalRanking, challengeDay,
} from './engagementService'

const WINDOW_MIN = 7
const SENTINEL = '__system__'

// Horarios/umbrales del acompañamiento (constantes: no requieren columnas nuevas).
const SUMMARY_TIME = '20:00'   // hora propia de resúmenes semanal/mensual (antes iban a las 23:50)
const REENGAGE_TIME = '11:00'  // hora del chequeo de reenganche/abandono
const REENGAGE_DAYS = 3        // días sin entregar para el mensaje de reconexión
const ABANDON_DAYS = 21        // días sin entregar para marcar ABANDONED (reversible al escribir)

// Fallback SOLO-en-memoria si la tabla `reto90d_send_log` no estuviera disponible.
// La idempotencia real es PERSISTENTE (ver claimSend).
const reminderGuard = new Set<string>()
const periodGuard = new Set<string>()
const reengageGuard = new Set<string>()
const lifecycleGuard = new Set<string>()

// Pausa anti-ban entre envíos (mismo espíritu que broadcast-worker): 800–1200 ms
// con jitter para no tener un patrón fijo que WhatsApp pueda detectar.
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
function sendDelayMs(): number {
  // MODO SEGURO (anti-baneo): pausa humana entre cada envío privado. Antes 0.8-1.2s;
  // subida a 4-10s para que los envíos a varios miembros no parezcan automatización
  // rápida (principal causa de bloqueo en WhatsApp no oficial / Baileys).
  return 4000 + Math.floor(Math.random() * 6000) // 4000..9999 ms
}

/**
 * Reserva PERSISTENTE de un envío (idempotencia en BD). Inserta la fila única
 * (challengeId, kind, date) en `reto90d_send_log`:
 *  - devuelve true  → ganamos la reserva, hay que enviar.
 *  - devuelve false → ya estaba reservada (otro tick/proceso ya envió) → NO enviar.
 * Usa raw SQL (bypass del cliente Prisma que puede estar "stale" sin regenerar).
 * Si la tabla aún no existe (migración pendiente), cae a un guard en memoria para
 * no romper el flujo del bot.
 */
async function claimSend(
  challengeId: string,
  kind: string,
  date: string,
  memGuard: Set<string>,
): Promise<{ ok: boolean; persistent: boolean }> {
  try {
    const inserted = await prisma.$executeRawUnsafe(
      `INSERT INTO reto90d_send_log (id, challenge_id, kind, date)
       VALUES (gen_random_uuid(), $1::uuid, $2, $3)
       ON CONFLICT (challenge_id, kind, date) DO NOTHING`,
      challengeId, kind, date,
    )
    return { ok: inserted === 1, persistent: true }
  } catch (err) {
    // Tabla ausente u otro error de BD → degradar a guard en memoria (best-effort).
    console.error('[reto90d/scheduler] claimSend BD falló, uso guard en memoria:', err)
    const key = `${challengeId}:${kind}:${date}`
    if (memGuard.has(key)) return { ok: false, persistent: false }
    memGuard.add(key)
    if (memGuard.size > 500) memGuard.clear()
    return { ok: true, persistent: false }
  }
}

/**
 * Libera la reserva (para reintentar en el próximo tick). Se usa cuando el envío
 * falló por completo (p.ej. bot caído): así NO queda marcado como enviado.
 */
async function releaseSend(
  challengeId: string,
  kind: string,
  date: string,
  persistent: boolean,
  memGuard: Set<string>,
): Promise<void> {
  if (!persistent) {
    memGuard.delete(`${challengeId}:${kind}:${date}`)
    return
  }
  try {
    await prisma.$executeRawUnsafe(
      `DELETE FROM reto90d_send_log WHERE challenge_id = $1::uuid AND kind = $2 AND date = $3`,
      challengeId, kind, date,
    )
  } catch (err) {
    console.error('[reto90d/scheduler] releaseSend falló:', err)
  }
}

export function laPazParts(tz: string): { date: string; hhmm: string } {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]))
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hhmm: `${parts.hour}:${parts.minute}` }
}
function minutesOf(hhmm: string): number {
  const [h, m] = String(hhmm).split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

type SchedulerResult = Record<string, unknown>

/** Envía el recordatorio correspondiente a la hora actual (o el forzado por `kind`). */
export async function runReminders(opts?: { kind?: ReminderKind }): Promise<SchedulerResult> {
  // Si reservamos el envío y algo lanza antes de terminar, liberamos para reintentar.
  let releaseClaim: (() => Promise<void>) | null = null
  try {
    const config = await prisma.whatsAppConfig.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
    })
    if (!config) return { skipped: 'sin config activa' }

    const tz = config.timezone || 'America/La_Paz'
    const { date, hhmm } = laPazParts(tz)

    const times: Record<ReminderKind, string> = {
      morning: config.morningReminderTime,
      midday: config.middayReminderTime,
      afternoon: config.afternoonReminderTime,
      night: config.nightReminderTime,
    }

    let kind: ReminderKind | null = opts?.kind && times[opts.kind] ? opts.kind : null
    if (!kind) {
      const nowM = minutesOf(hhmm)
      for (const k of Object.keys(times) as ReminderKind[]) {
        const diff = nowM - minutesOf(times[k])
        if (diff >= 0 && diff <= WINDOW_MIN) { kind = k; break }
      }
    }
    if (!kind) return { skipped: 'fuera de ventana', hhmm }

    const challenge = await getActiveChallenge(tz)
    if (!challenge) return { skipped: 'sin reto activo' }

    // Idempotencia PERSISTENTE: reservamos ANTES de enviar. Si ya estaba reservado
    // (otro tick/proceso), no reenviamos.
    const claim = await claimSend(challenge.id, kind, date, reminderGuard)
    if (!claim.ok) return { skipped: 'ya enviado', kind }
    releaseClaim = () => releaseSend(challenge.id, kind, date, claim.persistent, reminderGuard)

    const [allMembers, optedIn, tasks, instructions, openaiKey] = await Promise.all([
      listMembers(challenge.id, { status: 'ACTIVE' }),
      getOptedInPhones(challenge.id),
      getActiveTasksForToday(challenge.id),
      getRetoInstructions(),
      getEffectiveOpenAIKey(),
    ])
    // BAN-SAFE: solo a quienes ya le escribieron al bot.
    const members = allMembers.filter((m) => optedIn.has(m.phone))
    const { day: dayNumber, total: totalDays } = challengeDay(challenge.startDate, challenge.endDate)

    let sent = 0
    let idx = 0
    for (const m of members) {
      if (idx++ > 0) await sleep(sendDelayMs()) // pausa anti-ban entre envíos
      try {
        // Estado por tarea de ESTE miembro: qué entregó y qué le falta + su racha.
        const [pending, subs, streak] = await Promise.all([
          getPendingTasksForUser(m.phone, challenge.id, new Date()),
          getDaySubmissions(m.phone, challenge.id, new Date()),
          getStreak(m.phone, challenge.id),
        ])
        const pendingIds = new Set(pending.map((t) => t.id))
        const points = subs.filter((s) => s.status === 'APPROVED').reduce((a, s) => a + (s.pointsEarned || 0), 0)
        const tasksStatus: TaskStatusLite[] = tasks.map((t) => ({
          title: t.title, done: !pendingIds.has(t.id), points: t.points, evidenceType: t.evidenceType,
        }))

        const text = await generateReminder({
          instructions: instructions ?? undefined,
          participantName: (m.fullName || '').trim().split(/\s+/)[0] || m.fullName,
          challengeName: challenge.name,
          kind,
          tasksStatus,
          points,
          dayNumber,
          totalDays,
          streak,
          openaiKey: openaiKey ?? undefined,
        })
        if (await sendToPhone(m.phone, text)) sent++
      } catch (e) {
        console.error('[reto90d/scheduler] recordatorio miembro falló', m.phone, e)
      }
    }

    // Si había a quién enviar pero NADA salió (bot caído), liberamos la reserva
    // para reintentar en el próximo tick de la ventana.
    if (members.length > 0 && sent === 0) {
      releaseClaim = null
      await releaseSend(challenge.id, kind, date, claim.persistent, reminderGuard)
      return { skipped: 'envío falló (¿bot caído?), se reintentará', kind, members: members.length }
    }

    releaseClaim = null
    return { ok: true, kind, date, members: members.length, sent }
  } catch (err) {
    if (releaseClaim) { try { await releaseClaim() } catch { /* noop */ } }
    console.error('[reto90d/scheduler] runReminders error:', err)
    return { error: err instanceof Error ? err.message : 'error' }
  }
}

/** Acompañamiento SEMANAL (domingos) y MENSUAL (día 1) — resumen motivacional. */
export async function runPeriodicSummaries(): Promise<SchedulerResult> {
  let releaseClaim: (() => Promise<void>) | null = null
  try {
    const config = await prisma.whatsAppConfig.findFirst({ where: { isActive: true }, orderBy: { updatedAt: 'desc' } })
    if (!config) return { skipped: 'sin config activa' }
    const tz = config.timezone || 'America/La_Paz'
    const { date, hhmm } = laPazParts(tz)

    // Los resúmenes tienen HORA PROPIA (SUMMARY_TIME), separada del reporte final de
    // las 23:50, para no llegar 2-3 mensajes seguidos a medianoche.
    const diff = minutesOf(hhmm) - minutesOf(SUMMARY_TIME)
    if (!(diff >= 0 && diff <= WINDOW_MIN)) return { skipped: 'fuera de ventana' }

    const dow = new Date(`${date}T12:00:00Z`).getUTCDay() // 0 = domingo
    const dayOfMonth = parseInt(date.slice(8, 10), 10)

    let period: 'semana' | 'mes' | null = null
    let from: Date | null = null
    let periodDays = 7
    if (dayOfMonth === 1) { period = 'mes'; from = new Date(Date.now() - 30 * 86400000); periodDays = 30 }
    else if (dow === 0) { period = 'semana'; from = new Date(Date.now() - 7 * 86400000); periodDays = 7 }
    if (!period || !from) return { skipped: 'hoy no toca semana/mes' }

    const challenge = await getActiveChallenge(tz)
    if (!challenge) return { skipped: 'sin reto activo' }

    // Idempotencia PERSISTENTE por (reto, tipo-resumen, día).
    const kind = `resumen_${period}`
    const claim = await claimSend(challenge.id, kind, date, periodGuard)
    if (!claim.ok) return { skipped: 'ya enviado', period }
    releaseClaim = () => releaseSend(challenge.id, kind, date, claim.persistent, periodGuard)

    const [allMembers, optedIn, instructions, openaiKey] = await Promise.all([
      listMembers(challenge.id, { status: 'ACTIVE' }),
      getOptedInPhones(challenge.id),
      getRetoInstructions(),
      getEffectiveOpenAIKey(),
    ])
    const members = allMembers.filter((m) => optedIn.has(m.phone)) // ban-safe
    const now = new Date()

    let sent = 0
    let idx = 0
    for (const m of members) {
      if (idx++ > 0) await sleep(sendDelayMs()) // pausa anti-ban entre envíos
      try {
        const [stats, streak, position] = await Promise.all([
          getRangeStats(m.phone, challenge.id, from, now),
          getStreak(m.phone, challenge.id),
          getMemberPosition(challenge.id, m.phone),
        ])
        const text = await generateProgressMessage({
          instructions: instructions ?? undefined,
          participantName: (m.fullName || '').trim().split(/\s+/)[0] || m.fullName,
          challengeName: challenge.name,
          period,
          approved: stats.approved,
          points: stats.points,
          activeDays: stats.activeDays,
          periodDays,
          streak,
          position: position?.position,
          totalMembers: position?.total,
          pointsToNext: position?.pointsToNext,
          openaiKey: openaiKey ?? undefined,
        })
        // Resumen "de peso" → en VOZ si hay voz configurada (si no, texto).
        if (await sendCoachVoiceOrText(m.phone, text)) sent++
      } catch (e) {
        console.error('[reto90d/scheduler] resumen periódico falló', m.phone, e)
      }
    }

    // Bot caído (nada salió teniendo destinatarios) → liberar para reintentar.
    if (members.length > 0 && sent === 0) {
      releaseClaim = null
      await releaseSend(challenge.id, kind, date, claim.persistent, periodGuard)
      return { skipped: 'envío falló (¿bot caído?), se reintentará', period, members: members.length }
    }

    releaseClaim = null
    return { ok: true, period, date, members: members.length, sent }
  } catch (err) {
    if (releaseClaim) { try { await releaseClaim() } catch { /* noop */ } }
    console.error('[reto90d/scheduler] runPeriodicSummaries error:', err)
    return { error: err instanceof Error ? err.message : 'error' }
  }
}

/** Reporte final del día: por usuario + admin + grupo. Idempotente vía reto90d_reports. */
export async function runFinalReport(opts?: { force?: boolean }): Promise<SchedulerResult> {
  try {
    const config = await prisma.whatsAppConfig.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
    })
    if (!config) return { skipped: 'sin config activa' }

    const tz = config.timezone || 'America/La_Paz'
    const { date, hhmm } = laPazParts(tz)

    const diff = minutesOf(hhmm) - minutesOf(config.finalReportTime)
    const inWindow = diff >= 0 && diff <= WINDOW_MIN
    if (!opts?.force && !inWindow) return { skipped: 'fuera de ventana', hhmm }

    const challenge = await getActiveChallenge(tz)
    if (!challenge) return { skipped: 'sin reto activo' }

    const reportDate = new Date(`${date}T12:00:00.000Z`)
    const day = new Date()

    // ── 1) Reporte individual por miembro (idempotente por sentToUser) ──
    // BAN-SAFE: solo a quienes ya le escribieron al bot.
    const [allMembers, optedIn] = await Promise.all([
      listMembers(challenge.id, { status: 'ACTIVE' }),
      getOptedInPhones(challenge.id),
    ])
    const members = allMembers.filter((m) => optedIn.has(m.phone))
    const reportKey = (phone: string) => ({
      challengeId_phone_reportDate: { challengeId: challenge.id, phone, reportDate },
    })
    let usersSent = 0
    let idx = 0
    for (const m of members) {
      try {
        // Vía rápida: si ya se envió, no re-trabajar.
        const existing = await prisma.dailyReport.findUnique({ where: reportKey(m.phone) })
        if (existing?.sentToUser) continue

        const { text, stats } = await generateDailyUserReport(challenge.id, m.phone, day)

        // 1) Asegura la fila (con stats) SIN marcar enviado.
        await prisma.dailyReport.upsert({
          where: reportKey(m.phone),
          create: {
            challengeId: challenge.id, userId: m.userId ?? null, fullName: m.fullName, phone: m.phone,
            reportDate, totalTasks: stats.total, completed: stats.completed, pending: stats.pending,
            rejected: 0, review: 0, points: stats.points, summary: text, sentToUser: false,
          },
          update: {
            totalTasks: stats.total, completed: stats.completed, pending: stats.pending,
            points: stats.points, summary: text,
          },
        })

        // 2) RESERVA ATÓMICA: pasa sentToUser false→true en un update condicional.
        //    Solo un tick puede ganar (count===1); los solapados obtienen count===0.
        const claimed = await prisma.dailyReport.updateMany({
          where: { challengeId: challenge.id, phone: m.phone, reportDate, sentToUser: false },
          data: { sentToUser: true },
        })
        if (claimed.count === 0) continue // otro tick ya lo envió / lo está enviando

        // 3) Envía (con pausa anti-ban entre envíos reales).
        if (idx++ > 0) await sleep(sendDelayMs())
        const ok = await sendToPhone(m.phone, text)
        if (ok) {
          usersSent++
        } else {
          // Envío falló → soltar la reserva para reintentar en el próximo tick.
          await prisma.dailyReport.updateMany({
            where: { challengeId: challenge.id, phone: m.phone, reportDate },
            data: { sentToUser: false },
          })
        }
      } catch (e) {
        console.error('[reto90d/scheduler] reporte miembro falló', m.phone, e)
      }
    }

    // ── 2) Reporte admin + grupo (idempotente vía fila centinela) ──
    // Reserva ATÓMICA por canal: un update condicional (false→true) garantiza que
    // solo un tick envíe. Si el envío falla, se revierte para reintentar.
    let adminSent = false
    let groupSent = false
    try {
      const sentinelKey = {
        challengeId_phone_reportDate: { challengeId: challenge.id, phone: SENTINEL, reportDate },
      }
      const adminReport = await generateAdminDailyReport(challenge.id, day)

      // Asegura la fila centinela SIN marcar enviado.
      await prisma.dailyReport.upsert({
        where: sentinelKey,
        create: {
          challengeId: challenge.id, phone: SENTINEL, reportDate,
          totalTasks: 0, completed: 0, pending: 0, rejected: 0, review: 0, points: 0,
          summary: adminReport, sentToAdmin: false, sentToGroup: false,
        },
        update: { summary: adminReport },
      })

      // Reserva atómica del reporte ADMIN.
      const adminClaim = await prisma.dailyReport.updateMany({
        where: { challengeId: challenge.id, phone: SENTINEL, reportDate, sentToAdmin: false },
        data: { sentToAdmin: true },
      })
      if (adminClaim.count === 1) {
        adminSent = await sendToAdmin(adminReport)
        if (!adminSent) {
          await prisma.dailyReport.updateMany({
            where: { challengeId: challenge.id, phone: SENTINEL, reportDate },
            data: { sentToAdmin: false },
          })
        }
      }

      // Reserva atómica del reporte de GRUPO (si está habilitado).
      if (config.sendGroupReports) {
        const groupClaim = await prisma.dailyReport.updateMany({
          where: { challengeId: challenge.id, phone: SENTINEL, reportDate, sentToGroup: false },
          data: { sentToGroup: true },
        })
        if (groupClaim.count === 1) {
          const groupReport = await generateGroupReport(challenge.id, day)
          groupSent = await sendToGroup(groupReport)
          if (!groupSent) {
            await prisma.dailyReport.updateMany({
              where: { challengeId: challenge.id, phone: SENTINEL, reportDate },
              data: { sentToGroup: false },
            })
          }
        }
      }
    } catch (e) {
      console.error('[reto90d/scheduler] reporte admin/grupo falló', e)
    }

    return { ok: true, date, usersSent, adminSent, groupSent }
  } catch (err) {
    console.error('[reto90d/scheduler] runFinalReport error:', err)
    return { error: err instanceof Error ? err.message : 'error' }
  }
}

/** Clave 'YYYY-MM-DD' del día calendario UTC de una fecha guardada por el panel. */
function utcDateKey(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * REENGANCHE + ABANDONO (una vez al día, a REENGAGE_TIME).
 * - Reenganche: a los miembros ACTIVE opted-in que llevan ≥ REENGAGE_DAYS y
 *   < ABANDON_DAYS sin entregar, les manda UN mensaje cálido (en voz si hay voz).
 *   Idempotente por "lapso": la reserva usa la clave del último día activo, así que
 *   se envía UNA sola vez por racha de inactividad (se resetea si vuelven a entregar).
 * - Abandono: marca ABANDONED (sin mensaje) a los ACTIVE con ≥ ABANDON_DAYS de
 *   inactividad. Es REVERSIBLE: si el miembro vuelve a escribir, el inbound lo reactiva.
 * BAN-SAFE: los mensajes solo van a quienes ya le escribieron al bot.
 */
export async function runReengagement(): Promise<SchedulerResult> {
  try {
    const config = await prisma.whatsAppConfig.findFirst({ where: { isActive: true }, orderBy: { updatedAt: 'desc' } })
    if (!config) return { skipped: 'sin config activa' }
    const tz = config.timezone || 'America/La_Paz'
    const { date, hhmm } = laPazParts(tz)

    const diff = minutesOf(hhmm) - minutesOf(REENGAGE_TIME)
    if (!(diff >= 0 && diff <= WINDOW_MIN)) return { skipped: 'fuera de ventana' }

    const challenge = await getActiveChallenge(tz)
    if (!challenge) return { skipped: 'sin reto activo' }

    const [activeMembers, optedIn, instructions, openaiKey] = await Promise.all([
      listMembers(challenge.id, { status: 'ACTIVE' }),
      getOptedInPhones(challenge.id),
      getRetoInstructions(),
      getEffectiveOpenAIKey(),
    ])
    const { day: dayNumber, total: totalDays } = challengeDay(challenge.startDate, challenge.endDate)

    // Inactividad de cada ACTIVE (una sola vez, se reutiliza para reenganche y abandono).
    const inactivity = new Map<string, { inactiveDays: number; lastActiveKey: string }>()
    for (const m of activeMembers) {
      inactivity.set(m.phone, await getInactivity(m.phone, challenge.id, m.joinedAt))
    }

    // ── Reenganche (opted-in) ──
    let reengaged = 0
    let idx = 0
    for (const m of activeMembers) {
      if (!optedIn.has(m.phone)) continue
      const info = inactivity.get(m.phone)!
      if (info.inactiveDays < REENGAGE_DAYS || info.inactiveDays >= ABANDON_DAYS) continue
      const claim = await claimSend(challenge.id, `reenganche:${m.phone}`, info.lastActiveKey, reengageGuard)
      if (!claim.ok) continue
      if (idx++ > 0) await sleep(sendDelayMs())
      try {
        const text = await generateReengagement({
          instructions: instructions ?? undefined,
          participantName: (m.fullName || '').trim().split(/\s+/)[0] || m.fullName,
          challengeName: challenge.name,
          inactiveDays: info.inactiveDays,
          dayNumber,
          totalDays,
          openaiKey: openaiKey ?? undefined,
        })
        if (await sendCoachVoiceOrText(m.phone, text)) reengaged++
        else await releaseSend(challenge.id, `reenganche:${m.phone}`, info.lastActiveKey, claim.persistent, reengageGuard)
      } catch (e) {
        console.error('[reto90d/scheduler] reenganche miembro falló', m.phone, e)
        await releaseSend(challenge.id, `reenganche:${m.phone}`, info.lastActiveKey, claim.persistent, reengageGuard)
      }
    }

    // ── Abandono (una vez al día; marca ABANDONED, sin mensaje) ──
    let abandoned = 0
    const abandonClaim = await claimSend(challenge.id, 'abandono', date, lifecycleGuard)
    if (abandonClaim.ok) {
      for (const m of activeMembers) {
        const info = inactivity.get(m.phone)!
        if (info.inactiveDays < ABANDON_DAYS) continue
        try {
          await prisma.challengeMember.update({ where: { id: m.id }, data: { status: 'ABANDONED' } })
          abandoned++
        } catch (e) {
          console.error('[reto90d/scheduler] marcar ABANDONED falló', m.phone, e)
        }
      }
      if (abandoned > 0) console.log(`[reto90d/scheduler] ${abandoned} miembro(s) marcados ABANDONED (≥${ABANDON_DAYS}d sin actividad)`)
    }

    return { ok: true, reengaged, abandoned }
  } catch (err) {
    console.error('[reto90d/scheduler] runReengagement error:', err)
    return { error: err instanceof Error ? err.message : 'error' }
  }
}

/**
 * GRADUACIÓN (día final del reto, en la ventana del reporte final).
 * Marca a los ACTIVE como COMPLETED y manda un mensaje de cierre/logro (en voz si
 * hay voz) a los opted-in. Idempotente por reto (claim 'graduacion' del día).
 */
export async function runGraduation(): Promise<SchedulerResult> {
  try {
    const config = await prisma.whatsAppConfig.findFirst({ where: { isActive: true }, orderBy: { updatedAt: 'desc' } })
    if (!config) return { skipped: 'sin config activa' }
    const tz = config.timezone || 'America/La_Paz'
    const { date, hhmm } = laPazParts(tz)

    // Corre en la misma ventana que el reporte final (23:50), pero DESPUÉS de él.
    const diff = minutesOf(hhmm) - minutesOf(config.finalReportTime)
    if (!(diff >= 0 && diff <= WINDOW_MIN)) return { skipped: 'fuera de ventana' }

    const challenge = await getActiveChallenge(tz)
    if (!challenge) return { skipped: 'sin reto activo' }

    // Solo el ÚLTIMO día del reto.
    if (date !== utcDateKey(challenge.endDate)) return { skipped: 'no es el último día del reto' }

    const claim = await claimSend(challenge.id, 'graduacion', date, lifecycleGuard)
    if (!claim.ok) return { skipped: 'graduación ya procesada' }

    const [activeMembers, optedIn, ranking, instructions, openaiKey] = await Promise.all([
      listMembers(challenge.id, { status: 'ACTIVE' }),
      getOptedInPhones(challenge.id),
      getGlobalRanking(challenge.id),
      getRetoInstructions(),
      getEffectiveOpenAIKey(),
    ])
    const { total: totalDays } = challengeDay(challenge.startDate, challenge.endDate)
    const now = new Date()

    let graduated = 0
    let idx = 0
    for (const m of activeMembers) {
      // 1) Marcar COMPLETED (graduado) — a todos los ACTIVE, hayan escrito o no.
      try {
        await prisma.challengeMember.update({ where: { id: m.id }, data: { status: 'COMPLETED' } })
      } catch (e) {
        console.error('[reto90d/scheduler] marcar COMPLETED falló', m.phone, e)
      }
      // 2) Mensaje de graduación — BAN-SAFE: solo a quienes ya escribieron al bot.
      if (!optedIn.has(m.phone)) continue
      try {
        const stats = await getRangeStats(m.phone, challenge.id, challenge.startDate, now)
        const posIdx = ranking.findIndex((r) => r.phone === m.phone)
        const text = await generateGraduation({
          instructions: instructions ?? undefined,
          participantName: (m.fullName || '').trim().split(/\s+/)[0] || m.fullName,
          challengeName: challenge.name,
          approved: stats.approved,
          points: stats.points,
          activeDays: stats.activeDays,
          totalDays,
          position: posIdx >= 0 ? posIdx + 1 : undefined,
          totalMembers: ranking.length,
          openaiKey: openaiKey ?? undefined,
        })
        if (idx++ > 0) await sleep(sendDelayMs())
        if (await sendCoachVoiceOrText(m.phone, text)) graduated++
      } catch (e) {
        console.error('[reto90d/scheduler] graduación miembro falló', m.phone, e)
      }
    }

    console.log(`[reto90d/scheduler] graduación: ${activeMembers.length} completados, ${graduated} mensajes enviados`)
    return { ok: true, completed: activeMembers.length, graduated }
  } catch (err) {
    console.error('[reto90d/scheduler] runGraduation error:', err)
    return { error: err instanceof Error ? err.message : 'error' }
  }
}
