export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { updateDailyTask, deleteDailyTask } from '@/lib/reto90d/taskService'
import { prisma } from '@/lib/prisma'
import { handleRouteError } from '../../_shared'

const evidenceTypeSchema = z.enum(['IMAGE', 'TEXT', 'NUMBER', 'LINK', 'DOCUMENT'])

const patchSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  evidenceType: evidenceTypeSchema.optional(),
  expectedKeywords: z.array(z.string()).optional(),
  points: z.number().optional(),
  deadlineTime: z.string().min(1).optional(),
  autoApproveMin: z.number().optional(),
  requiresReview: z.boolean().optional(),
  validExamples: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
})

/** Devuelve true si la tarea existe (para responder 404 en vez de 500). */
async function taskExists(id: string): Promise<boolean> {
  const t = await prisma.dailyTask.findUnique({ where: { id }, select: { id: true } })
  return !!t
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const body = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  if (!(await taskExists(params.id))) {
    return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 })
  }

  try {
    const task = await updateDailyTask(params.id, parsed.data)
    return NextResponse.json({ task })
  } catch (err) {
    return handleRouteError(err, 'tasks/[id] PATCH')
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  if (!(await taskExists(params.id))) {
    return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 })
  }

  try {
    await deleteDailyTask(params.id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return handleRouteError(err, 'tasks/[id] DELETE')
  }
}
