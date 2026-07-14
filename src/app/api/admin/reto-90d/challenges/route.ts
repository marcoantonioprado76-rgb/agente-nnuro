export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import {
  listChallenges,
  getActiveChallenge,
  createChallenge,
} from '@/lib/reto90d/challengeService'
import { handleRouteError } from '../_shared'

const createSchema = z
  .object({
    name: z.string().min(1),
    description: z.string().nullable().optional(),
    startDate: z.string().min(1),
    endDate: z.string().min(1),
    isActive: z.boolean().optional(),
  })
  .refine((d) => new Date(d.startDate) <= new Date(d.endDate), {
    message: 'La fecha de fin no puede ser anterior a la de inicio',
    path: ['endDate'],
  })

export async function GET(_req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const [challenges, active] = await Promise.all([
    listChallenges(),
    getActiveChallenge(),
  ])

  return NextResponse.json({ challenges, activeId: active?.id ?? null })
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

  const { name, description, startDate, endDate, isActive } = parsed.data
  try {
    const challenge = await createChallenge({
      name,
      description: description ?? null,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isActive,
    })
    return NextResponse.json({ challenge })
  } catch (err) {
    return handleRouteError(err, 'challenges POST')
  }
}
