export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { isRecursosAdmin } from '@/lib/recursos'

const updateSchema = z.object({
  nombre: z.string().trim().min(1).max(60).optional(),
  activo: z.boolean().optional(),
  orden: z.number().int().min(0).max(9999).optional(),
})

// PATCH /api/recursos/areas/[id] → renombrar / mostrar-ocultar / reordenar (SOLO admin)
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getAuthUser()
  if (!isRecursosAdmin(user)) {
    return NextResponse.json({ error: 'Acceso denegado. Solo administradores.' }, { status: 403 })
  }
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

  try {
    const area = await (prisma as any).flyerArea.update({
      where: { id: params.id }, data: parsed.data,
      select: { id: true, nombre: true, orden: true, activo: true },
    })
    return NextResponse.json({ area })
  } catch {
    return NextResponse.json({ error: 'No se pudo actualizar (¿nombre repetido o área inexistente?)' }, { status: 409 })
  }
}

// DELETE /api/recursos/areas/[id] → eliminar área (SOLO admin)
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getAuthUser()
  if (!isRecursosAdmin(user)) {
    return NextResponse.json({ error: 'Acceso denegado. Solo administradores.' }, { status: 403 })
  }
  try {
    await (prisma as any).flyerArea.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Área no encontrada' }, { status: 404 })
  }
}
