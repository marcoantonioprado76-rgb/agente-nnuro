export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { isRecursosAdmin } from '@/lib/recursos'

// GET /api/recursos/areas         → áreas ACTIVAS (para el menú de usuarios), ordenadas
// GET /api/recursos/areas?todos=1 → todas (activas+inactivas), solo admin (para gestionarlas)
export async function GET(req: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = isRecursosAdmin(user)
  const verTodas = new URL(req.url).searchParams.get('todos') === '1' && admin

  const areas = await (prisma as any).flyerArea.findMany({
    where: verTodas ? {} : { activo: true },
    orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
    select: { id: true, nombre: true, orden: true, activo: true },
  })
  return NextResponse.json({ areas, isAdmin: admin })
}

const createSchema = z.object({ nombre: z.string().trim().min(1).max(60) })

// POST /api/recursos/areas → agregar área (SOLO admin)
export async function POST(req: Request) {
  const user = await getAuthUser()
  if (!isRecursosAdmin(user)) {
    return NextResponse.json({ error: 'Acceso denegado. Solo administradores.' }, { status: 403 })
  }
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Nombre inválido' }, { status: 400 })

  const max = await (prisma as any).flyerArea.aggregate({ _max: { orden: true } })
  try {
    const area = await (prisma as any).flyerArea.create({
      data: { nombre: parsed.data.nombre, orden: (max._max.orden ?? -1) + 1, activo: true },
      select: { id: true, nombre: true, orden: true, activo: true },
    })
    return NextResponse.json({ area }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Ya existe un área con ese nombre.' }, { status: 409 })
  }
}
