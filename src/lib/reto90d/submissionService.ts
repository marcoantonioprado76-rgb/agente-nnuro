import { Prisma } from '@prisma/client'
import type { TaskSubmission, DailyTask } from '@prisma/client'
import { prisma } from '@/lib/prisma'

// ═══════════════════════════════════════════════════════════════════════════
// Reto 90D — Servicio de entregas (submissions). ADMIN-ONLY, solo lógica de
// servidor. El "día" se calcula siempre en la zona horaria del reto
// (America/La_Paz) usando Intl.DateTimeFormat.
// ═══════════════════════════════════════════════════════════════════════════

/** Estados posibles de una entrega (paridad con el schema Prisma). */
export type SubmissionStatus =
    | 'PENDING'
    | 'APPROVED'
    | 'REJECTED'
    | 'REVIEW'
    | 'DUPLICATED'
    | 'NEEDS_CLARIFICATION'

/**
 * Contrato de salida del clasificador IA (lo produce otro módulo).
 * Este servicio solo lo consume para persistir la decisión.
 */
export type AiResult = {
    detectedTaskId: string | null
    detectedTaskTitle: string | null
    confidence: number
    status: 'APPROVED' | 'REJECTED' | 'REVIEW' | 'NEEDS_CLARIFICATION' | 'DUPLICATED'
    points: number
    explanation: string
    needsManualReview: boolean
    userMessage: string
}

/** Datos de entrada para crear una entrega. */
export type CreateSubmissionData = {
    taskId?: string
    challengeId?: string
    userId?: string
    fullName?: string
    phone: string
    whatsappMsgId: string
    mediaUrl?: string
    mediaHash?: string
    textContent?: string
}

const DEFAULT_TZ = 'America/La_Paz'
const ONE_DAY_MS = 24 * 60 * 60 * 1000

// ───────────────────────────────────────────────────────────────────────────
// Utilidades de zona horaria / cálculo del "día"
// ───────────────────────────────────────────────────────────────────────────

/** Devuelve la fecha 'YYYY-MM-DD' del instante dado, en la zona indicada. */
export function getDayKey(date: Date, timeZone: string = DEFAULT_TZ): string {
    // 'en-CA' produce el formato ISO YYYY-MM-DD de forma estable.
    return new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(date)
}

/**
 * Offset en ms tal que: wallClock(zona) = utc + offset.
 * Para America/La_Paz (sin horario de verano) es constante -4h.
 */
function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    }).formatToParts(date)

    const map: Record<string, number> = {}
    for (const p of parts) {
        if (p.type !== 'literal') map[p.type] = Number(p.value)
    }
    // Algunos entornos ICU devuelven '24' para la medianoche.
    const hour = map.hour === 24 ? 0 : map.hour
    const asUTC = Date.UTC(map.year, map.month - 1, map.day, hour, map.minute, map.second)
    return asUTC - date.getTime()
}

/**
 * Rango [start, end) en UTC que corresponde al día natural (en `timeZone`) del
 * instante dado. Úsalo en filtros Prisma: { gte: start, lt: end }.
 */
export function getDayRange(
    day: Date,
    timeZone: string = DEFAULT_TZ,
): { start: Date; end: Date; dayKey: string } {
    const dayKey = getDayKey(day, timeZone)
    const [y, m, d] = dayKey.split('-').map(Number)
    const wallMidnightAsUTC = Date.UTC(y, m - 1, d, 0, 0, 0, 0)
    const offset = getTimeZoneOffsetMs(new Date(wallMidnightAsUTC), timeZone)
    const start = new Date(wallMidnightAsUTC - offset)
    const end = new Date(start.getTime() + ONE_DAY_MS)
    return { start, end, dayKey }
}

// ───────────────────────────────────────────────────────────────────────────
// Creación de entregas (idempotente por whatsappMsgId)
// ───────────────────────────────────────────────────────────────────────────

/**
 * Crea una entrega en estado PENDING. IDEMPOTENTE: si `whatsappMsgId` ya existe
 * devuelve la entrega existente sin duplicar (chequeo previo + protección ante
 * carreras vía violación de unique P2002).
 */
export async function createSubmission(data: CreateSubmissionData): Promise<TaskSubmission> {
    const existing = await prisma.taskSubmission.findUnique({
        where: { whatsappMsgId: data.whatsappMsgId },
    })
    if (existing) return existing

    try {
        return await prisma.taskSubmission.create({
            data: {
                taskId: data.taskId ?? null,
                challengeId: data.challengeId ?? null,
                userId: data.userId ?? null,
                fullName: data.fullName ?? null,
                phone: data.phone,
                whatsappMsgId: data.whatsappMsgId,
                mediaUrl: data.mediaUrl ?? null,
                mediaHash: data.mediaHash ?? null,
                textContent: data.textContent ?? null,
                status: 'PENDING',
                pointsEarned: 0,
            },
        })
    } catch (err) {
        // Carrera: otra petición insertó el mismo whatsappMsgId entre el
        // findUnique y el create. Devolvemos la fila ya existente.
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
            const again = await prisma.taskSubmission.findUnique({
                where: { whatsappMsgId: data.whatsappMsgId },
            })
            if (again) return again
        }
        throw err
    }
}

// ───────────────────────────────────────────────────────────────────────────
// Anti-duplicados (nivel 2: mismo phone + mismo mediaHash el mismo día)
// ───────────────────────────────────────────────────────────────────────────

/**
 * true si ya existe una entrega del mismo `phone` con el mismo `mediaHash` en el
 * mismo día (America/La_Paz). Solo cuenta cuando `mediaHash` está presente.
 */
export async function detectDuplicateSubmission(
    phone: string,
    opts: { mediaHash?: string; day: Date },
): Promise<boolean> {
    if (!opts.mediaHash) return false

    const { start, end } = getDayRange(opts.day)
    const dup = await prisma.taskSubmission.findFirst({
        where: {
            phone,
            mediaHash: opts.mediaHash,
            submittedAt: { gte: start, lt: end },
        },
        select: { id: true },
    })
    return dup !== null
}

// ───────────────────────────────────────────────────────────────────────────
// Anti doble-puntuación (una tarea solo puede aprobarse UNA vez por día)
// ───────────────────────────────────────────────────────────────────────────

/**
 * true si ese `phone` ya tiene una entrega APPROVED de la MISMA tarea (`taskId`)
 * en el mismo día (America/La_Paz). Sirve para no volver a sumar puntos cuando
 * llegan dos fotos válidas distintas de la misma tarea el mismo día.
 * `exceptSubmissionId` excluye la propia entrega que se está evaluando.
 */
export async function isTaskAlreadyApprovedToday(
    phone: string,
    taskId: string,
    day: Date,
    opts?: { challengeId?: string | null; exceptSubmissionId?: string },
): Promise<boolean> {
    const { start, end } = getDayRange(day)
    const found = await prisma.taskSubmission.findFirst({
        where: {
            phone,
            taskId,
            status: 'APPROVED',
            submittedAt: { gte: start, lt: end },
            ...(opts?.challengeId ? { challengeId: opts.challengeId } : {}),
            ...(opts?.exceptSubmissionId ? { id: { not: opts.exceptSubmissionId } } : {}),
        },
        select: { id: true },
    })
    return found !== null
}

// ───────────────────────────────────────────────────────────────────────────
// Aplicar la clasificación de la IA
// ───────────────────────────────────────────────────────────────────────────

/**
 * Persiste la decisión del clasificador IA sobre una entrega.
 * - `status` se mapea directamente (los estados de IA son un subconjunto válido).
 * - Guarda SIEMPRE aiConfidence, aiExplanation y aiTaskDetected (diagnóstico).
 * - Solo si APPROVED asigna pointsEarned y conecta el taskId detectado.
 * - GUARDA DE SEGURIDAD: si esa tarea YA fue aprobada hoy para este teléfono,
 *   NO vuelve a puntuar (la degrada a DUPLICATED con 0 puntos). Evita el doble
 *   conteo aunque el clasificador apruebe dos fotos válidas de la misma tarea.
 */
export async function applyClassification(
    submissionId: string,
    ai: AiResult,
): Promise<TaskSubmission> {
    // Guarda anti doble-puntuación: solo aplica a aprobaciones con tarea detectada.
    if (ai.status === 'APPROVED' && ai.detectedTaskId) {
        const current = await prisma.taskSubmission.findUnique({
            where: { id: submissionId },
            select: { phone: true, challengeId: true, submittedAt: true },
        })
        if (
            current &&
            (await isTaskAlreadyApprovedToday(current.phone, ai.detectedTaskId, current.submittedAt, {
                challengeId: current.challengeId,
                exceptSubmissionId: submissionId,
            }))
        ) {
            return prisma.taskSubmission.update({
                where: { id: submissionId },
                data: {
                    status: 'DUPLICATED',
                    pointsEarned: 0,
                    aiConfidence: ai.confidence,
                    aiExplanation: `Tarea ya aprobada hoy; no se vuelve a puntuar. ${ai.explanation}`,
                    aiTaskDetected: ai.detectedTaskTitle,
                },
            })
        }
    }

    const updateData: Prisma.TaskSubmissionUpdateInput = {
        status: ai.status,
        aiConfidence: ai.confidence,
        aiExplanation: ai.explanation,
        aiTaskDetected: ai.detectedTaskTitle,
    }

    if (ai.status === 'APPROVED') {
        updateData.pointsEarned = ai.points
        if (ai.detectedTaskId) {
            updateData.task = { connect: { id: ai.detectedTaskId } }
        }
    } else {
        updateData.pointsEarned = 0
    }

    return prisma.taskSubmission.update({
        where: { id: submissionId },
        data: updateData,
    })
}

// ───────────────────────────────────────────────────────────────────────────
// Correcciones manuales (SIEMPRE registran un SubmissionReviewLog)
// ───────────────────────────────────────────────────────────────────────────

/** Lee el estado actual de una entrega o lanza si no existe. */
async function requireCurrentStatus(
    tx: Prisma.TransactionClient,
    id: string,
): Promise<SubmissionStatus> {
    const current = await tx.taskSubmission.findUnique({
        where: { id },
        select: { status: true },
    })
    if (!current) throw new Error(`TaskSubmission no encontrada: ${id}`)
    return current.status as SubmissionStatus
}

/**
 * Aprueba manualmente una entrega. Asigna estado APPROVED, puntos, revisor y
 * fecha de revisión, y crea un SubmissionReviewLog.
 * Puntos: usa `opts.points` si viene; si no, deriva de la tarea (`opts.taskId`);
 * si tampoco hay tarea, conserva los puntos actuales.
 */
export async function approveSubmission(
    id: string,
    opts: { taskId?: string; points?: number; reviewedBy: string; reason?: string },
): Promise<TaskSubmission> {
    return prisma.$transaction(async (tx) => {
        const previousStatus = await requireCurrentStatus(tx, id)

        let points = opts.points
        if (typeof points !== 'number' && opts.taskId) {
            const task = await tx.dailyTask.findUnique({
                where: { id: opts.taskId },
                select: { points: true },
            })
            points = task?.points
        }

        const updateData: Prisma.TaskSubmissionUpdateInput = {
            status: 'APPROVED',
            reviewedBy: opts.reviewedBy,
            reviewedAt: new Date(),
        }
        if (typeof points === 'number') updateData.pointsEarned = points
        if (opts.taskId) updateData.task = { connect: { id: opts.taskId } }

        const updated = await tx.taskSubmission.update({ where: { id }, data: updateData })

        await tx.submissionReviewLog.create({
            data: {
                submissionId: id,
                reviewedBy: opts.reviewedBy,
                previousStatus,
                newStatus: 'APPROVED',
                reason: opts.reason ?? null,
            },
        })

        return updated
    })
}

/**
 * Rechaza manualmente una entrega. Estado REJECTED, pointsEarned = 0, revisor y
 * fecha de revisión, y crea un SubmissionReviewLog.
 */
export async function rejectSubmission(
    id: string,
    opts: { reason?: string; reviewedBy: string },
): Promise<TaskSubmission> {
    return prisma.$transaction(async (tx) => {
        const previousStatus = await requireCurrentStatus(tx, id)

        const updated = await tx.taskSubmission.update({
            where: { id },
            data: {
                status: 'REJECTED',
                pointsEarned: 0,
                reviewedBy: opts.reviewedBy,
                reviewedAt: new Date(),
            },
        })

        await tx.submissionReviewLog.create({
            data: {
                submissionId: id,
                reviewedBy: opts.reviewedBy,
                previousStatus,
                newStatus: 'REJECTED',
                reason: opts.reason ?? null,
            },
        })

        return updated
    })
}

/**
 * Marca una entrega para revisión manual. Estado REVIEW y crea un
 * SubmissionReviewLog. No fija reviewedAt (la revisión aún no concluyó).
 */
export async function markSubmissionForReview(
    id: string,
    opts: { reviewedBy: string; reason?: string },
): Promise<TaskSubmission> {
    return prisma.$transaction(async (tx) => {
        const previousStatus = await requireCurrentStatus(tx, id)

        const updated = await tx.taskSubmission.update({
            where: { id },
            data: { status: 'REVIEW' },
        })

        await tx.submissionReviewLog.create({
            data: {
                submissionId: id,
                reviewedBy: opts.reviewedBy,
                previousStatus,
                newStatus: 'REVIEW',
                reason: opts.reason ?? null,
            },
        })

        return updated
    })
}

// ───────────────────────────────────────────────────────────────────────────
// Consultas de apoyo
// ───────────────────────────────────────────────────────────────────────────

/**
 * Tareas ACTIVAS del reto que ese `phone` todavía NO ha completado (APPROVED)
 * en el día indicado (America/La_Paz).
 */
export async function getPendingTasksForUser(
    phone: string,
    challengeId: string,
    day: Date,
): Promise<DailyTask[]> {
    const { start, end } = getDayRange(day)

    const activeTasks = await prisma.dailyTask.findMany({
        where: { challengeId, isActive: true },
    })

    const approved = await prisma.taskSubmission.findMany({
        where: {
            phone,
            challengeId,
            status: 'APPROVED',
            taskId: { not: null },
            submittedAt: { gte: start, lt: end },
        },
        select: { taskId: true },
    })

    const doneTaskIds = new Set(
        approved.map((s) => s.taskId).filter((t): t is string => t !== null),
    )
    return activeTasks.filter((t) => !doneTaskIds.has(t.id))
}

/**
 * Última entrega en NEEDS_CLARIFICATION (con foto) de ese `phone` HOY, si existe.
 * Sirve para cerrar el loop: cuando la IA no pudo identificar la tarea de una foto,
 * el usuario responde con el nombre de la tarea y re-clasificamos ESA entrega.
 */
export async function getPendingClarification(
  phone: string,
  challengeId: string,
  day: Date = new Date(),
): Promise<TaskSubmission | null> {
  const { start, end } = getDayRange(day)
  return prisma.taskSubmission.findFirst({
    where: {
      phone,
      challengeId,
      status: 'NEEDS_CLARIFICATION',
      mediaUrl: { not: null },
      submittedAt: { gte: start, lt: end },
    },
    orderBy: { submittedAt: 'desc' },
  })
}

/** Todas las entregas de un `phone` en el día indicado (America/La_Paz). */
export async function getDaySubmissions(
    phone: string,
    challengeId: string,
    day: Date,
): Promise<TaskSubmission[]> {
    const { start, end } = getDayRange(day)
    return prisma.taskSubmission.findMany({
        where: {
            phone,
            challengeId,
            submittedAt: { gte: start, lt: end },
        },
        orderBy: { submittedAt: 'asc' },
    })
}

/** Progreso de un miembro en un rango [from, to): tareas aprobadas, puntos y días activos. */
export async function getRangeStats(
    phone: string,
    challengeId: string,
    from: Date,
    to: Date,
): Promise<{ approved: number; points: number; activeDays: number }> {
    try {
        const subs = await prisma.taskSubmission.findMany({
            where: { phone, challengeId, status: 'APPROVED', submittedAt: { gte: from, lt: to } },
            select: { pointsEarned: true, submittedAt: true },
        })
        const points = subs.reduce((a, s) => a + (s.pointsEarned || 0), 0)
        const days = new Set(subs.map((s) => s.submittedAt.toISOString().slice(0, 10))).size
        return { approved: subs.length, points, activeDays: days }
    } catch (err) {
        console.error('[reto90d/submissionService] getRangeStats failed:', err)
        return { approved: 0, points: 0, activeDays: 0 }
    }
}
