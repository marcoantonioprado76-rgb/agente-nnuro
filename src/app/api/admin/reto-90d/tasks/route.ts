export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { getDailyTasks, createDailyTask } from '@/lib/reto90d/taskService'
import { handleRouteError } from '../_shared'

const evidenceTypeSchema = z.enum(['IMAGE', 'TEXT', 'NUMBER', 'LINK', 'DOCUMENT'])

const createSchema = z.object({
  challengeId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  evidenceType: evidenceTypeSchema,
  expectedKeywords: z.array(z.string()).optional(),
  points: z.number().optional(),
  deadlineTime: z.string().min(1),
  autoApproveMin: z.number().optional(),
  requiresReview: z.boolean().optional(),
  validExamples: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const { searchParams } = new URL(req.url)
  const challengeId = searchParams.get('challengeId')
  if (!challengeId) {
    return NextResponse.json({ error: 'challengeId es requerido' }, { status: 400 })
  }

  const tasks = await getDailyTasks(challengeId)
  return NextResponse.json({ tasks })
}

export async function POST(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { challengeId, ...data } = parsed.data
  try {
    const task = await createDailyTask(challengeId, data)
    return NextResponse.json({ task })
  } catch (err) {
    return handleRouteError(err, 'tasks POST')
  }
}
