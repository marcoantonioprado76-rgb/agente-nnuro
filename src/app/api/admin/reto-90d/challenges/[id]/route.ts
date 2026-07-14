export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import {
  getChallenge,
  updateChallenge,
  setChallengeActive,
  deleteChallenge,
} from '@/lib/reto90d/challengeService'
import { handleRouteError } from '../../_shared'

const patchSchema = z
  .object({
    name: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
    startDate: z.string().min(1).optional(),
    endDate: z.string().min(1).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (d) => !(d.startDate && d.endDate) || new Date(d.startDate) <= new Date(d.endDate),
    { message: 'La fecha de fin no puede ser anterior a la de inicio', path: ['endDate'] },
  )

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const challenge = await getChallenge(params.id)
  if (!challenge) {
    return NextResponse.json({ error: 'Reto no encontrado' }, { status: 404 })
  }

  return NextResponse.json({ challenge })
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

  // Registro inexistente → 404 (no 500).
  const existing = await getChallenge(params.id)
  if (!existing) {
    return NextResponse.json({ error: 'Reto no encontrado' }, { status: 404 })
  }

  const data = parsed.data
  const keys = Object.keys(data)

  try {
    // Toggle simple de activación → usa el servicio dedicado.
    if (keys.length === 1 && keys[0] === 'isActive' && typeof data.isActive === 'boolean') {
      const challenge = await setChallengeActive(params.id, data.isActive)
      return NextResponse.json({ challenge })
    }

    const challenge = await updateChallenge(params.id, {
      name: data.name,
      description: data.description,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      isActive: data.isActive,
    })

    return NextResponse.json({ challenge })
  } catch (err) {
    return handleRouteError(err, 'challenges/[id] PATCH')
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  // Registro inexistente → 404.
  const challenge = await getChallenge(params.id)
  if (!challenge) {
    return NextResponse.json({ error: 'Reto no encontrado' }, { status: 404 })
  }

  // Salvaguarda: borrar un reto elimina en cascada tareas, miembros y evidencias.
  // Si el reto está ACTIVO exigimos confirmación explícita (?confirm=1) para no
  // destruir datos por accidente.
  const confirm = ['1', 'true', 'yes'].includes(
    (new URL(req.url).searchParams.get('confirm') || '').toLowerCase(),
  )
  if (challenge.isActive && !confirm) {
    return NextResponse.json(
      {
        error:
          'El reto está ACTIVO. Se eliminarían tareas, miembros y evidencias en cascada. ' +
          'Para confirmar el borrado, repite la solicitud con ?confirm=1.',
      },
      { status: 409 },
    )
  }

  try {
    await deleteChallenge(params.id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return handleRouteError(err, 'challenges/[id] DELETE')
  }
}
