import type { ChallengeMember } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getDayRange } from './submissionService'

// ═══════════════════════════════════════════════════════════════════════════
// Reto 90D — Servicio de ranking y progreso. ADMIN-ONLY, solo lógica de
// servidor. El "día" se calcula en America/La_Paz (ver getDayRange).
// Los puntos y completados se cuentan solo sobre entregas APPROVED.
// ═══════════════════════════════════════════════════════════════════════════

export type MemberProgress = {
    completedToday: number
    pointsToday: number
    pointsTotal: number
    pendingToday: number
    totalTasks: number
}

export type RankingEntry = {
    phone: string
    fullName: string
    points: number
    completed: number
}

/**
 * Progreso del miembro (por `phone`) en el reto. "Hoy" se evalúa en la zona
 * horaria del reto (America/La_Paz) usando la fecha actual del servidor.
 */
export async function getMemberProgress(
    challengeId: string,
    phone: string,
): Promise<MemberProgress> {
    const { start, end } = getDayRange(new Date())

    const totalTasks = await prisma.dailyTask.count({
        where: { challengeId, isActive: true },
    })

    const approvedToday = await prisma.taskSubmission.findMany({
        where: {
            challengeId,
            phone,
            status: 'APPROVED',
            submittedAt: { gte: start, lt: end },
        },
        select: { taskId: true, pointsEarned: true },
    })

    const completedTaskIds = new Set(
        approvedToday.map((s) => s.taskId).filter((t): t is string => t !== null),
    )
    const completedToday = completedTaskIds.size
    const pointsToday = approvedToday.reduce((sum, s) => sum + s.pointsEarned, 0)

    const totalAgg = await prisma.taskSubmission.aggregate({
        where: { challengeId, phone, status: 'APPROVED' },
        _sum: { pointsEarned: true },
    })
    const pointsTotal = totalAgg._sum.pointsEarned ?? 0

    const pendingToday = Math.max(0, totalTasks - completedToday)

    return { completedToday, pointsToday, pointsTotal, pendingToday, totalTasks }
}

/**
 * Ranking del día para un reto, ordenado desc por puntos (APPROVED ese día).
 * Incluye a todos los miembros del reto; los sin actividad quedan en 0.
 */
export async function getDailyRanking(
    challengeId: string,
    date: Date,
): Promise<RankingEntry[]> {
    const { start, end } = getDayRange(date)

    const members = await prisma.challengeMember.findMany({
        where: { challengeId },
        select: { phone: true, fullName: true },
    })

    const subs = await prisma.taskSubmission.findMany({
        where: {
            challengeId,
            status: 'APPROVED',
            submittedAt: { gte: start, lt: end },
        },
        select: { phone: true, taskId: true, pointsEarned: true },
    })

    const byPhone = new Map<string, { points: number; tasks: Set<string> }>()
    for (const s of subs) {
        const entry = byPhone.get(s.phone) ?? { points: 0, tasks: new Set<string>() }
        entry.points += s.pointsEarned
        if (s.taskId) entry.tasks.add(s.taskId)
        byPhone.set(s.phone, entry)
    }

    const ranking: RankingEntry[] = members.map((m) => {
        const entry = byPhone.get(m.phone)
        return {
            phone: m.phone,
            fullName: m.fullName,
            points: entry?.points ?? 0,
            completed: entry?.tasks.size ?? 0,
        }
    })

    ranking.sort((a, b) => b.points - a.points)
    return ranking
}

/**
 * Miembros ACTIVE que no tienen ninguna entrega aprobada (APPROVED) en el día
 * indicado (America/La_Paz).
 */
export async function getLaggingMembers(
    challengeId: string,
    date: Date,
): Promise<ChallengeMember[]> {
    const { start, end } = getDayRange(date)

    const activeMembers = await prisma.challengeMember.findMany({
        where: { challengeId, status: 'ACTIVE' },
    })

    const approved = await prisma.taskSubmission.findMany({
        where: {
            challengeId,
            status: 'APPROVED',
            submittedAt: { gte: start, lt: end },
        },
        select: { phone: true },
        distinct: ['phone'],
    })

    const withApproval = new Set(approved.map((a) => a.phone))
    return activeMembers.filter((m) => !withApproval.has(m.phone))
}

/**
 * Tasa de cumplimiento (0-100): promedio, entre los miembros ACTIVE, de
 * (tareas completadas ese día / total de tareas activas). Redondeada a 1 decimal.
 * Devuelve 0 si no hay tareas activas o no hay miembros activos.
 */
export async function getComplianceRate(
    challengeId: string,
    date: Date,
): Promise<number> {
    const { start, end } = getDayRange(date)

    const totalTasks = await prisma.dailyTask.count({
        where: { challengeId, isActive: true },
    })
    if (totalTasks === 0) return 0

    const activeMembers = await prisma.challengeMember.findMany({
        where: { challengeId, status: 'ACTIVE' },
        select: { phone: true },
    })
    if (activeMembers.length === 0) return 0

    const subs = await prisma.taskSubmission.findMany({
        where: {
            challengeId,
            status: 'APPROVED',
            submittedAt: { gte: start, lt: end },
        },
        select: { phone: true, taskId: true },
    })

    const completedByPhone = new Map<string, Set<string>>()
    for (const s of subs) {
        if (!s.taskId) continue
        const set = completedByPhone.get(s.phone) ?? new Set<string>()
        set.add(s.taskId)
        completedByPhone.set(s.phone, set)
    }

    let sumRate = 0
    for (const m of activeMembers) {
        const completed = completedByPhone.get(m.phone)?.size ?? 0
        sumRate += Math.min(completed, totalTasks) / totalTasks
    }

    const avgPercent = (sumRate / activeMembers.length) * 100
    return Math.round(avgPercent * 10) / 10
}
