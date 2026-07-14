import { prisma } from '@/lib/prisma'

// ═══════════════════════════════════════════════════════════════════════════
// Reto 90D — Servicio de tareas diarias (DailyTask). ADMIN-ONLY, sin UI.
// Lógica de servidor pura sobre el modelo `reto90d_tasks`.
// ═══════════════════════════════════════════════════════════════════════════

/** Tipos de evidencia soportados (columna string en Prisma). */
export type EvidenceType = 'IMAGE' | 'TEXT' | 'NUMBER' | 'LINK' | 'DOCUMENT'

export interface CreateDailyTaskInput {
  title: string
  description: string
  evidenceType: EvidenceType
  expectedKeywords?: string[]
  points?: number
  deadlineTime: string // "HH:mm"
  autoApproveMin?: number
  requiresReview?: boolean
  validExamples?: string[]
  isActive?: boolean
}

export type UpdateDailyTaskInput = Partial<CreateDailyTaskInput>

/** Crea una tarea diaria dentro de un reto. */
export async function createDailyTask(challengeId: string, data: CreateDailyTaskInput) {
  try {
    return await prisma.dailyTask.create({
      data: {
        challengeId,
        title: data.title,
        description: data.description,
        evidenceType: data.evidenceType,
        expectedKeywords: data.expectedKeywords ?? [],
        points: data.points ?? undefined,
        deadlineTime: data.deadlineTime,
        autoApproveMin: data.autoApproveMin ?? undefined,
        requiresReview: data.requiresReview ?? undefined,
        validExamples: data.validExamples ?? [],
        isActive: data.isActive ?? undefined,
      },
    })
  } catch (err) {
    console.error(`[reto90d/taskService] createDailyTask failed (challengeId=${challengeId}):`, err)
    throw new Error('No se pudo crear la tarea diaria')
  }
}

/** Actualiza una tarea diaria. Los campos no provistos (undefined) se omiten. */
export async function updateDailyTask(id: string, data: UpdateDailyTaskInput) {
  try {
    return await prisma.dailyTask.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        evidenceType: data.evidenceType,
        expectedKeywords: data.expectedKeywords,
        points: data.points,
        deadlineTime: data.deadlineTime,
        autoApproveMin: data.autoApproveMin,
        requiresReview: data.requiresReview,
        validExamples: data.validExamples,
        isActive: data.isActive,
      },
    })
  } catch (err) {
    console.error(`[reto90d/taskService] updateDailyTask failed (id=${id}):`, err)
    throw new Error('No se pudo actualizar la tarea diaria')
  }
}

/**
 * Borrado real de una tarea. Las submissions ligadas usan onDelete: SetNull,
 * por lo que no se pierden (su taskId queda en null).
 */
export async function deleteDailyTask(id: string) {
  try {
    return await prisma.dailyTask.delete({ where: { id } })
  } catch (err) {
    console.error(`[reto90d/taskService] deleteDailyTask failed (id=${id}):`, err)
    throw new Error('No se pudo eliminar la tarea diaria')
  }
}

/** Lista las tareas de un reto; con `onlyActive` filtra las activas. */
export async function getDailyTasks(
  challengeId: string,
  opts?: { onlyActive?: boolean },
) {
  try {
    return await prisma.dailyTask.findMany({
      where: {
        challengeId,
        ...(opts?.onlyActive ? { isActive: true } : {}),
      },
      orderBy: [{ deadlineTime: 'asc' }, { createdAt: 'asc' }],
    })
  } catch (err) {
    console.error(`[reto90d/taskService] getDailyTasks failed (challengeId=${challengeId}):`, err)
    throw new Error('No se pudieron obtener las tareas diarias')
  }
}

/** Tareas activas del reto que aplican hoy (isActive = true). */
export async function getActiveTasksForToday(challengeId: string) {
  return getDailyTasks(challengeId, { onlyActive: true })
}
