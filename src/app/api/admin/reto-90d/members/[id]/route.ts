export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { setMemberStatus, removeMember, updateMember, deleteMember } from '@/lib/reto90d/memberService'
import { prisma } from '@/lib/prisma'
import { handleRouteError } from '../../_shared'

const patchSchema = z.object({
  status: z.enum(['ACTIVE', 'PAUSED', 'REMOVED']).optional(),
  fullName: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  // Correo válido o vacío; null/undefined permitidos.
  email: z.string().email('Correo inválido').or(z.literal('')).nullable().optional(),
  country: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
})

/** Devuelve true si el miembro existe (para responder 404 en vez de 500). */
async function memberExists(id: string): Promise<boolean> {
  const m = await prisma.challengeMember.findUnique({ where: { id }, select: { id: true } })
  return !!m
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const parsed = patchSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 })
  }

  if (!(await memberExists(params.id))) {
    return NextResponse.json({ error: 'Miembro no encontrado' }, { status: 404 })
  }

  const { status, ...profile } = parsed.data

  try {
    // Solo cambio de estado.
    if (status && Object.keys(profile).length === 0) {
      const member = status === 'REMOVED' ? await removeMember(params.id) : await setMemberStatus(params.id, status)
      return NextResponse.json({ member })
    }

    // Edición de datos (opcionalmente + estado).
    let member = await updateMember(params.id, profile)
    if (status) {
      member = status === 'REMOVED' ? await removeMember(params.id) : await setMemberStatus(params.id, status)
    }
    return NextResponse.json({ member })
  } catch (err) {
    return handleRouteError(err, 'members/[id] PATCH')
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  if (!(await memberExists(params.id))) {
    return NextResponse.json({ error: 'Miembro no encontrado' }, { status: 404 })
  }

  try {
    await deleteMember(params.id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return handleRouteError(err, 'members/[id] DELETE')
  }
}
