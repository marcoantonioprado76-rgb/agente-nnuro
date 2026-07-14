/**
 * Reto 90D — Generadores de reportes (ADMIN-ONLY, sin UI).
 *
 * Lee submissions / tareas / miembros desde la BD y formatea el texto exacto
 * de los reportes diarios (usuario, admin y grupo). Todas las fechas se
 * calculan en la zona horaria 'America/La_Paz'.
 */

import { prisma } from '@/lib/prisma'
import { getDayRange } from './submissionService'
import { getStreak, getMemberPosition } from './engagementService'

const TIMEZONE = 'America/La_Paz'

// ─── Utilidades de fecha (zona horaria America/La_Paz) ────────────────────────

/**
 * Rango [start, end) en UTC que cubre el día natural en La Paz correspondiente
 * a la fecha proporcionada, más una etiqueta legible DD/MM/YYYY.
 * Usa `getDayRange` (mismo cálculo que submissionService) para que reportes y
 * entregas compartan EXACTAMENTE la misma definición de "día" en La Paz.
 */
function laPazDayRange(date: Date): { start: Date; end: Date; label: string } {
  const { start, end } = getDayRange(date, TIMEZONE)

  const labelFmt = new Intl.DateTimeFormat('es-BO', {
    timeZone: TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  return { start, end, label: labelFmt.format(date) }
}

// ─── Cálculo de estadísticas diarias compartidas (admin + grupo) ──────────────

interface SubmissionRow {
  phone: string
  status: string
  taskId: string | null
  pointsEarned: number
  fullName: string | null
}

interface LeaderEntry {
  name: string
  points: number
}

interface DailyStats {
  label: string
  totalTasks: number
  activeMembers: number
  activeUsers: number
  approved: number
  pending: number
  review: number
  rejected: number
  distinctApproved: number
  totalPoints: number
  compliancePct: number
  leaderboard: LeaderEntry[]
}

async function computeDailyStats(challengeId: string, date: Date): Promise<DailyStats> {
  const { start, end, label } = laPazDayRange(date)

  const [totalTasks, members, submissions] = await Promise.all([
    prisma.dailyTask.count({ where: { challengeId, isActive: true } }),
    prisma.challengeMember.findMany({
      where: { challengeId, status: 'ACTIVE' },
      select: { phone: true, fullName: true },
    }),
    prisma.taskSubmission.findMany({
      where: { challengeId, submittedAt: { gte: start, lt: end } },
      select: { phone: true, status: true, taskId: true, pointsEarned: true, fullName: true },
    }),
  ])

  const nameByPhone = new Map<string, string>()
  for (const m of members) nameByPhone.set(m.phone, m.fullName)

  const activePhones = new Set<string>()
  const approvedPairs = new Set<string>()
  const pointsByPhone = new Map<string, number>()

  let approved = 0
  let pending = 0
  let review = 0
  let rejected = 0
  let totalPoints = 0

  for (const s of submissions as SubmissionRow[]) {
    activePhones.add(s.phone)
    if (!nameByPhone.has(s.phone) && s.fullName) nameByPhone.set(s.phone, s.fullName)

    switch (s.status) {
      case 'APPROVED': {
        approved += 1
        totalPoints += s.pointsEarned
        pointsByPhone.set(s.phone, (pointsByPhone.get(s.phone) ?? 0) + s.pointsEarned)
        // Consistente con ranking/pendientes: solo cuentan tareas identificadas
        // (taskId no nulo). Las aprobaciones sin tarea no cierran una tarea concreta.
        if (s.taskId) approvedPairs.add(`${s.phone}::${s.taskId}`)
        break
      }
      case 'PENDING':
        pending += 1
        break
      case 'REVIEW':
        review += 1
        break
      case 'REJECTED':
        rejected += 1
        break
      default:
        break
    }
  }

  const distinctApproved = approvedPairs.size
  const expected = members.length * totalTasks
  const compliancePct = expected > 0 ? Math.round((distinctApproved / expected) * 100) : 0

  const leaderboard: LeaderEntry[] = Array.from(pointsByPhone.entries())
    .map(([phone, points]) => ({ name: nameByPhone.get(phone) ?? phone, points }))
    .sort((a, b) => b.points - a.points)
    .slice(0, 3)

  return {
    label,
    totalTasks,
    activeMembers: members.length,
    activeUsers: activePhones.size,
    approved,
    pending,
    review,
    rejected,
    distinctApproved,
    totalPoints,
    compliancePct,
    leaderboard,
  }
}

function formatLeaderboard(leaders: LeaderEntry[]): string {
  if (leaders.length === 0) return 'Sin líderes registrados aún.'
  return leaders.map((l, i) => `${i + 1}. ${l.name} - ${l.points} pts`).join('\n')
}

// ─── Reporte diario del usuario ───────────────────────────────────────────────

export async function generateDailyUserReport(
  challengeId: string,
  phone: string,
  date: Date,
): Promise<{ text: string; stats: { total: number; completed: number; pending: number; points: number } }> {
  const { start, end } = laPazDayRange(date)

  const [totalTasks, member, submissions] = await Promise.all([
    prisma.dailyTask.count({ where: { challengeId, isActive: true } }),
    prisma.challengeMember.findFirst({
      where: { challengeId, phone },
      select: { fullName: true },
    }),
    prisma.taskSubmission.findMany({
      where: { challengeId, phone, submittedAt: { gte: start, lt: end } },
      select: { status: true, taskId: true, pointsEarned: true },
    }),
  ])

  const approvedTaskIds = new Set<string>()
  let points = 0
  for (const s of submissions) {
    if (s.status === 'APPROVED') {
      // Consistente con ranking/pendientes: "completadas" = tareas DISTINTAS
      // identificadas (taskId no nulo). Los puntos sí suman todo lo aprobado.
      if (s.taskId) approvedTaskIds.add(s.taskId)
      points += s.pointsEarned
    }
  }

  const completed = approvedTaskIds.size
  const pending = Math.max(totalTasks - completed, 0)
  const nombre = member?.fullName ?? 'Participante'

  const estado =
    completed === 0 ? 'Sin actividad' : completed >= totalTasks ? 'Excelente' : 'En progreso'

  // Racha y posición en el ranking acumulado (best-effort: si fallan, se omiten).
  const [streak, position] = await Promise.all([
    getStreak(phone, challengeId).catch(() => 0),
    getMemberPosition(challengeId, phone).catch(() => null),
  ])
  const rachaLine = streak >= 2 ? `\n🔥 Racha: ${streak} días seguidos.` : ''
  const posLine = position ? `\n🏅 Vas #${position.position} de ${position.total} en el ranking.` : ''

  const text =
    `📊 Reporte diario - Reto 90D\n` +
    `Hola ${nombre}, este es tu avance de hoy:\n` +
    `✅ Tareas entregadas: ${completed} / ${totalTasks}  ⭐ Puntos ganados: ${points}  ⏳ Pendientes: ${pending}  📌 Estado: ${estado}` +
    rachaLine + posLine + '\n' +
    `Mañana seguimos construyendo disciplina, duplicación y resultados.`

  return { text, stats: { total: totalTasks, completed, pending, points } }
}

// ─── Reporte general del admin ────────────────────────────────────────────────

export async function generateAdminDailyReport(challengeId: string, date: Date): Promise<string> {
  const stats = await computeDailyStats(challengeId, date)

  return (
    `📊 Reporte general Reto 90D\n` +
    `Fecha: ${stats.label}\n` +
    `👥 Usuarios activos: ${stats.activeUsers}\n` +
    `✅ Entregas aprobadas: ${stats.approved}\n` +
    `⏳ Pendientes: ${stats.pending}\n` +
    `🔍 En revisión: ${stats.review}\n` +
    `❌ Rechazadas: ${stats.rejected}\n` +
    `🏆 Top 3 por puntos:\n` +
    `${formatLeaderboard(stats.leaderboard)}\n` +
    `📈 Cumplimiento general: ${stats.compliancePct}%`
  )
}

// ─── Reporte de cierre para el grupo ──────────────────────────────────────────

export async function generateGroupReport(challengeId: string, date: Date): Promise<string> {
  const stats = await computeDailyStats(challengeId, date)

  return (
    `🏆 Cierre del día - Reto 90D\n` +
    `${stats.label}\n` +
    `✅ Tareas completadas: ${stats.distinctApproved}\n` +
    `⏳ Pendientes: ${stats.pending}\n` +
    `⭐ Puntos totales: ${stats.totalPoints}\n` +
    `📈 Cumplimiento: ${stats.compliancePct}%\n` +
    `🥇 Top 3 líderes:\n` +
    `${formatLeaderboard(stats.leaderboard)}`
  )
}
