export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { zonasSchema, isRecursosAdmin } from '@/lib/recursos'
import { contentOrgWhere } from '@/lib/org-content'

const createSchema = z.object({
  nombre: z.string().min(1).max(120),
  categoria: z.string().min(1).max(60),
  ancho: z.number().int().positive().max(10000),
  alto: z.number().int().positive().max(10000),
  fondoUrl: z.string().url(),
  thumbUrl: z.string().url().optional(),
  zonas: zonasSchema,
})

// GET /api/recursos/templates           → plantillas ACTIVAS (cualquier usuario)
// GET /api/recursos/templates?todos=1    → TODAS (activas + inactivas), SOLO admin de Recursos
export async function GET(req: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = isRecursosAdmin(user)
  const { searchParams } = new URL(req.url)
  const categoria = searchParams.get('categoria') || undefined
  const verTodas = searchParams.get('todos') === '1' && admin
  const orgWhere = await contentOrgWhere(user.id)

  const templates = await (prisma as any).template.findMany({
    where: { ...orgWhere, ...(verTodas ? {} : { activo: true }), ...(categoria ? { categoria } : {}) },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, nombre: true, categoria: true,
      ancho: true, alto: true, thumbUrl: true, fondoUrl: true,
      ...(verTodas ? { activo: true, createdAt: true } : {}),
    },
  })

  return NextResponse.json({ templates, isAdmin: admin })
}

// POST /api/recursos/templates  → crear plantilla (SOLO admin de Recursos)
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

  const template = await (prisma as any).template.create({
    data: {
      nombre: d.nombre, categoria: d.categoria, ancho: d.ancho, alto: d.alto,
      fondoUrl: d.fondoUrl, thumbUrl: d.thumbUrl ?? null, zonas: d.zonas,
      activo: true, creadoPor: (user as any).id,
    },
  })

  return NextResponse.json({ template }, { status: 201 })
}
