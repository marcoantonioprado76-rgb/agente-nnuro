export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getOrgAdmin, unauthorizedOrg } from '@/lib/org-auth'
import { zonasSchema } from '@/lib/recursos'
import { prisma } from '@/lib/prisma'

async function owns(id: string, organizationId: string): Promise<boolean> {
  const t = await (prisma as any).template.findUnique({ where: { id }, select: { organizationId: true } })
  return !!t && t.organizationId === organizationId
}

// GET → un flyer completo (con zonas) de SU empresa, para editarlo
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await getOrgAdmin()
    if (!auth) return unauthorizedOrg()
    const flyer = await (prisma as any).template.findUnique({
      where: { id: params.id },
      select: { id: true, nombre: true, categoria: true, ancho: true, alto: true, fondoUrl: true, thumbUrl: true, zonas: true, activo: true, organizationId: true },
    })
    if (!flyer || flyer.organizationId !== auth.organizationId) return unauthorizedOrg()
    return NextResponse.json({ flyer })
  } catch (e) {
    console.error('[GET /api/empresa/content/flyers/[id]]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// PATCH → editar el flyer (nombre/categoría/activo y/o el diseño completo: zonas/fondo)
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await getOrgAdmin()
    if (!auth) return unauthorizedOrg()
    if (!(await owns(params.id, auth.organizationId))) return unauthorizedOrg()
    const body = await req.json().catch(() => ({}))
    const data: Record<string, unknown> = {}
    if (typeof body.nombre === 'string' && body.nombre.trim()) data.nombre = body.nombre.trim()
    if (typeof body.categoria === 'string' && body.categoria.trim()) data.categoria = body.categoria.trim()
    if (typeof body.activo === 'boolean') data.activo = body.activo
    if (typeof body.fondoUrl === 'string' && body.fondoUrl.trim()) data.fondoUrl = body.fondoUrl.trim()
    if (Number.isInteger(body.ancho) && body.ancho > 0) data.ancho = body.ancho
    if (Number.isInteger(body.alto) && body.alto > 0) data.alto = body.alto
    if (body.zonas !== undefined) {
      const z = zonasSchema.safeParse(body.zonas)
      if (!z.success) return NextResponse.json({ error: 'Zonas inválidas' }, { status: 400 })
      data.zonas = z.data
    }
    const flyer = await (prisma as any).template.update({ where: { id: params.id }, data })
    return NextResponse.json({ flyer })
  } catch (e) {
    console.error('[PATCH /api/empresa/content/flyers/[id]]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// DELETE → borrar flyer de SU empresa
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await getOrgAdmin()
    if (!auth) return unauthorizedOrg()
    if (!(await owns(params.id, auth.organizationId))) return unauthorizedOrg()
    await (prisma as any).template.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[DELETE /api/empresa/content/flyers/[id]]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
