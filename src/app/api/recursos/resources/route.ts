export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { isRecursosAdmin } from '@/lib/recursos'
import { contentOrgWhere } from '@/lib/org-content'

const createSchema = z.object({
  tipo: z.enum(['presentacion', 'libro']),
  titulo: z.string().min(1).max(150),
  categoria: z.string().min(1).max(60),
  archivoUrl: z.string().url(),
  portadaUrl: z.string().url().optional(),
  paginas: z.number().int().positive().max(5000).optional(),
})

// GET /api/recursos/resources?tipo=presentacion|libro&categoria=  → lista ACTIVA (usuarios)
// GET ...&todos=1  → todas (activas + inactivas), solo admin de Recursos
export async function GET(req: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = isRecursosAdmin(user)
  const { searchParams } = new URL(req.url)
  const tipo = searchParams.get('tipo') || undefined
  const categoria = searchParams.get('categoria') || undefined
  const verTodas = searchParams.get('todos') === '1' && admin
  const orgWhere = await contentOrgWhere(user.id)

  const resources = await (prisma as any).resource.findMany({
    where: {
      ...orgWhere,
      ...(tipo ? { tipo } : {}),
      ...(categoria ? { categoria } : {}),
      ...(verTodas ? {} : { activo: true }),
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, tipo: true, titulo: true, categoria: true,
      archivoUrl: true, portadaUrl: true, paginas: true,
      ...(verTodas ? { activo: true, createdAt: true } : {}),
    },
  })

  return NextResponse.json({ resources, isAdmin: admin })
}

// POST /api/recursos/resources  → crear presentación o libro (SOLO admin)
export async function POST(req: Request) {
  const user = await getAuthUser()
  if (!isRecursosAdmin(user)) {
    return NextResponse.json({ error: 'Acceso denegado. Solo administradores.' }, { status: 403 })
  }

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', detalles: parsed.error.flatten() }, { status: 400 })
  }
  const d = parsed.data

  const resource = await (prisma as any).resource.create({
    data: {
      tipo: d.tipo, titulo: d.titulo, categoria: d.categoria,
      archivoUrl: d.archivoUrl, portadaUrl: d.portadaUrl ?? null, paginas: d.paginas ?? null,
      activo: true, creadoPor: (user as any).id,
    },
  })

  return NextResponse.json({ resource }, { status: 201 })
}
