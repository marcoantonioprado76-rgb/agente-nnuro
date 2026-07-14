export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getOrgAdmin, unauthorizedOrg } from '@/lib/org-auth'
import { zonasSchema } from '@/lib/recursos'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createSchema = z.object({
  nombre: z.string().min(1).max(120),
  categoria: z.string().min(1).max(60),
  ancho: z.number().int().positive().max(10000),
  alto: z.number().int().positive().max(10000),
  fondoUrl: z.string().url(),
  thumbUrl: z.string().url().optional(),
  zonas: zonasSchema,
})

// GET → flyers (templates) de SU empresa
export async function GET() {
  try {
    const auth = await getOrgAdmin()
    if (!auth) return unauthorizedOrg()
    const flyers = await (prisma as any).template.findMany({
      where: { organizationId: auth.organizationId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, nombre: true, categoria: true, ancho: true, alto: true, fondoUrl: true, thumbUrl: true, activo: true, organizationId: true, createdAt: true },
    })
    return NextResponse.json({ flyers })
  } catch (e) {
    console.error('[GET /api/empresa/content/flyers]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// POST → crea un flyer privado de SU empresa
export async function POST(req: Request) {
  try {
    const auth = await getOrgAdmin()
    if (!auth) return unauthorizedOrg()
    const body = await req.json().catch(() => null)
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos', detalles: parsed.error.flatten() }, { status: 400 })
    const d = parsed.data
    const flyer = await (prisma as any).template.create({
      data: {
        nombre: d.nombre, categoria: d.categoria, ancho: d.ancho, alto: d.alto,
        fondoUrl: d.fondoUrl, thumbUrl: d.thumbUrl ?? null, zonas: d.zonas,
        activo: true, creadoPor: (auth.user as any).id, organizationId: auth.organizationId,
      },
    })
    return NextResponse.json({ flyer }, { status: 201 })
  } catch (e) {
    console.error('[POST /api/empresa/content/flyers]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
