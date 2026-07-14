export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { isRecursosAdmin } from '@/lib/recursos'
import { viewerOrgId } from '@/lib/org-content'

// GET /api/recursos/resources/[id]  → una presentación/libro (para el visor)
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const resource = await (prisma as any).resource.findUnique({ where: { id: params.id } })
  if (!resource || !resource.activo) {
    return NextResponse.json({ error: 'Recurso no encontrado' }, { status: 404 })
  }
  // Aislamiento por empresa: el recurso debe pertenecer a la empresa del que mira
  const oid = await viewerOrgId(user.id)
  if ((resource.organizationId ?? null) !== oid) {
    return NextResponse.json({ error: 'Recurso no encontrado' }, { status: 404 })
  }
  return NextResponse.json({ resource })
}

const updateSchema = z.object({
  titulo: z.string().min(1).max(150).optional(),
  categoria: z.string().min(1).max(60).optional(),
  activo: z.boolean().optional(),
  portadaUrl: z.string().url().optional(),
  paginas: z.number().int().positive().max(5000).optional(),
})

// PATCH /api/recursos/resources/[id]  → editar / activar-ocultar (SOLO admin)
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getAuthUser()
  if (!isRecursosAdmin(user)) {
    return NextResponse.json({ error: 'Acceso denegado. Solo administradores.' }, { status: 403 })
  }

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', detalles: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const resource = await (prisma as any).resource.update({ where: { id: params.id }, data: parsed.data })
    return NextResponse.json({ resource })
  } catch {
    return NextResponse.json({ error: 'Recurso no encontrado' }, { status: 404 })
  }
}

// DELETE /api/recursos/resources/[id]  → borrar (SOLO admin)
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getAuthUser()
  if (!isRecursosAdmin(user)) {
    return NextResponse.json({ error: 'Acceso denegado. Solo administradores.' }, { status: 403 })
  }

  try {
    await (prisma as any).resource.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Recurso no encontrado' }, { status: 404 })
  }
}
