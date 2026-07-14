export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getOrgAdmin, unauthorizedOrg } from '@/lib/org-auth'
import { prisma } from '@/lib/prisma'

// Verifica que el recurso pertenezca a la empresa del caller.
async function ownsResource(id: string, organizationId: string): Promise<boolean> {
  const r = await (prisma as any).resource.findUnique({
    where: { id },
    select: { organizationId: true },
  })
  return !!r && r.organizationId === organizationId
}

// PATCH → editar un recurso de SU empresa (sin tocar organizationId)
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await getOrgAdmin()
    if (!auth) return unauthorizedOrg()
    if (!(await ownsResource(params.id, auth.organizationId))) return unauthorizedOrg()

    const body = await req.json().catch(() => ({}))
    const data: Record<string, unknown> = {}
    if (typeof body.titulo === 'string' && body.titulo.trim()) data.titulo = body.titulo.trim()
    if (typeof body.categoria === 'string' && body.categoria.trim()) data.categoria = body.categoria.trim()
    if (typeof body.archivoUrl === 'string' && body.archivoUrl.trim()) data.archivoUrl = body.archivoUrl.trim()
    if (body.portadaUrl !== undefined) data.portadaUrl = body.portadaUrl?.trim() || null
    if (body.paginas !== undefined) data.paginas = body.paginas ? parseInt(String(body.paginas)) || null : null
    if (typeof body.activo === 'boolean') data.activo = body.activo
    if (['presentacion', 'libro'].includes(body.tipo)) data.tipo = body.tipo

    const resource = await (prisma as any).resource.update({ where: { id: params.id }, data })
    return NextResponse.json({ resource })
  } catch (e) {
    console.error('[PATCH /api/empresa/content/recursos/[id]]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// DELETE → borrar un recurso de SU empresa
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await getOrgAdmin()
    if (!auth) return unauthorizedOrg()
    if (!(await ownsResource(params.id, auth.organizationId))) return unauthorizedOrg()
    await (prisma as any).resource.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[DELETE /api/empresa/content/recursos/[id]]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
