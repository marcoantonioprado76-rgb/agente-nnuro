// ─────────────────────────────────────────────────────────────────────────────
// Reto 90D — Motor de progreso y engagement (ADMIN-ONLY, solo servidor).
//
// Calcula, SOBRE los datos que ya existen (submissions/miembros), las señales que
// dan vida al reto: racha (días seguidos), "Día X de 90", ranking ACUMULADO y
// posición, e inactividad (para reenganche/abandono). No requiere columnas nuevas.
// El "día" se calcula SIEMPRE en America/La_Paz (igual que submissionService).
// ─────────────────────────────────────────────────────────────────────────────
import { prisma } from '@/lib/prisma'
import { getDayKey, getDayRange } from './submissionService'

const TZ = 'America/La_Paz'
const DAY_MS = 24 * 60 * 60 * 1000

// ── Utilidades de fechas 'YYYY-MM-DD' ────────────────────────────────────────

/** ms UTC de una clave 'YYYY-MM-DD' (tratada como día calendario, medianoche UTC). */
function keyToMs(key: string): number {
  const [y, m, d] = key.split('-').map(Number)
  return Date.UTC(y, (m || 1) - 1, d || 1)
}
/** Clave del día anterior a `key`. */
function prevKey(key: string): string {
  return new Date(keyToMs(key) - DAY_MS).toISOString().slice(0, 10)
}
/** Diferencia en días enteros entre dos claves (b - a). */
function diffDays(a: string, b: string): number {
  return Math.round((keyToMs(b) - keyToMs(a)) / DAY_MS)
}
/** Clave del día calendario (UTC) de una fecha guardada por el panel (medianoche). */
function utcDateKey(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// ── "Día X de N" del reto ────────────────────────────────────────────────────

/**
 * Día actual del reto (1-based) y total de días, según startDate/endDate.
 * Las fechas del reto se guardan como medianoche del día calendario (UTC), así que
 * usamos su día calendario UTC como ancla; "hoy" se toma en La Paz.
 */
export function challengeDay(
  startDate: Date,
  endDate: Date,
  now: Date = new Date(),
): { day: number; total: number } {
  const startKey = utcDateKey(startDate)
  const endKey = utcDateKey(endDate)
  const todayKey = getDayKey(now, TZ)
  const total = Math.max(1, diffDays(startKey, endKey) + 1)
  const day = Math.min(Math.max(1, diffDays(startKey, todayKey) + 1), total)
  return { day, total }
}

// ── Racha (días consecutivos con ≥1 tarea APROBADA) ──────────────────────────

/**
 * Racha actual del participante: días consecutivos (terminando hoy o ayer) con al
 * menos una entrega APROBADA. Si hoy aún no entregó, la racha sigue viva contando
 * hasta ayer (no se rompe hasta que pase un día completo sin actividad).
 */
export async function getStreak(phone: string, challengeId: string): Promise<number> {
  try {
    const subs = await prisma.taskSubmission.findMany({
      where: { phone, challengeId, status: 'APPROVED' },
      select: { submittedAt: true },
    })
    if (!subs.length) return 0
    const keys = new Set(subs.map((s) => getDayKey(s.submittedAt, TZ)))
    const todayKey = getDayKey(new Date(), TZ)
    let cursor = keys.has(todayKey) ? todayKey : prevKey(todayKey)
    let streak = 0
    while (keys.has(cursor)) {
      streak++
      cursor = prevKey(cursor)
    }
    return streak
  } catch (err) {
    console.error('[reto90d/engagement] getStreak failed:', err)
    return 0
  }
}

// ── Ranking ACUMULADO del reto + posición del participante ───────────────────

export type GlobalRankEntry = { phone: string; fullName: string; points: number }

/** Ranking acumulado del reto: miembros ordenados por puntos totales (APPROVED). */
export async function getGlobalRanking(challengeId: string): Promise<GlobalRankEntry[]> {
  const [members, agg] = await Promise.all([
    prisma.challengeMember.findMany({ where: { challengeId }, select: { phone: true, fullName: true } }),
    prisma.taskSubmission.groupBy({
      by: ['phone'],
      where: { challengeId, status: 'APPROVED' },
      _sum: { pointsEarned: true },
    }),
  ])
  const pointsByPhone = new Map(agg.map((a) => [a.phone, a._sum.pointsEarned ?? 0]))
  return members
    .map((m) => ({ phone: m.phone, fullName: m.fullName, points: pointsByPhone.get(m.phone) ?? 0 }))
    .sort((a, b) => b.points - a.points)
}

export type MemberPosition = { position: number; total: number; points: number; pointsToNext: number }

/** Posición del participante en el ranking acumulado (o null si no está en el reto). */
export async function getMemberPosition(
  challengeId: string,
  phone: string,
): Promise<MemberPosition | null> {
  const ranking = await getGlobalRanking(challengeId)
  const idx = ranking.findIndex((r) => r.phone === phone)
  if (idx === -1) return null
  const points = ranking[idx].points
  const pointsToNext = idx === 0 ? 0 : Math.max(0, ranking[idx - 1].points - points)
  return { position: idx + 1, total: ranking.length, points, pointsToNext }
}

// ── Inactividad (para reenganche / abandono / panel) ─────────────────────────

/**
 * Días de inactividad de un miembro: días transcurridos (La Paz) desde su ÚLTIMA
 * entrega (de cualquier estado). Si nunca entregó, se mide desde `joinedAt`.
 * Devuelve también la clave del último día activo (para idempotencia del reenganche).
 */
export async function getInactivity(
  phone: string,
  challengeId: string,
  joinedAt: Date,
): Promise<{ inactiveDays: number; lastActiveKey: string }> {
  const last = await prisma.taskSubmission.findFirst({
    where: { phone, challengeId },
    orderBy: { submittedAt: 'desc' },
    select: { submittedAt: true },
  })
  const lastDate = last?.submittedAt ?? joinedAt
  const lastActiveKey = getDayKey(lastDate, TZ)
  const inactiveDays = Math.max(0, diffDays(lastActiveKey, getDayKey(new Date(), TZ)))
  return { inactiveDays, lastActiveKey }
}

// ── Rezagados detallados (panel) ─────────────────────────────────────────────

export type LaggingDetail = {
  phone: string
  fullName: string
  completed: number
  total: number
  pending: number
  inactiveDays: number
}

/**
 * Miembros ACTIVE con tareas pendientes HOY, con cuánto les falta y hace cuántos
 * días que no entregan nada. Ordenados por inactividad y luego por pendientes.
 * Reemplaza al viejo "lagging" (que solo daba nombre/teléfono).
 */
export async function getLaggingDetailed(
  challengeId: string,
  date: Date = new Date(),
): Promise<LaggingDetail[]> {
  const todayKey = getDayKey(date, TZ)
  const { start, end } = getDayRange(date, TZ)
  const [members, totalTasks, approvedToday, lastByPhone] = await Promise.all([
    prisma.challengeMember.findMany({
      where: { challengeId, status: 'ACTIVE' },
      select: { phone: true, fullName: true, joinedAt: true },
    }),
    prisma.dailyTask.count({ where: { challengeId, isActive: true } }),
    prisma.taskSubmission.findMany({
      where: { challengeId, status: 'APPROVED', taskId: { not: null }, submittedAt: { gte: start, lt: end } },
      select: { phone: true, taskId: true },
    }),
    prisma.taskSubmission.groupBy({
      by: ['phone'],
      where: { challengeId },
      _max: { submittedAt: true },
    }),
  ])

  // Tareas distintas aprobadas HOY por teléfono.
  const doneToday = new Map<string, Set<string>>()
  for (const s of approvedToday) {
    if (!s.taskId) continue
    const set = doneToday.get(s.phone) ?? new Set<string>()
    set.add(s.taskId)
    doneToday.set(s.phone, set)
  }
  const lastMap = new Map(lastByPhone.map((r) => [r.phone, r._max.submittedAt]))

  const rows: LaggingDetail[] = []
  for (const m of members) {
    const completed = doneToday.get(m.phone)?.size ?? 0
    const pending = Math.max(0, totalTasks - completed)
    if (pending <= 0) continue // al día → no es rezagado
    const lastDate = lastMap.get(m.phone) ?? m.joinedAt
    const inactiveDays = Math.max(0, diffDays(getDayKey(lastDate, TZ), todayKey))
    rows.push({ phone: m.phone, fullName: m.fullName, completed, total: totalTasks, pending, inactiveDays })
  }
  rows.sort((a, b) => b.inactiveDays - a.inactiveDays || b.pending - a.pending)
  return rows
}
