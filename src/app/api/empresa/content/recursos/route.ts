export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getOrgAdmin, unauthorizedOrg } from '@/lib/org-auth'
import { prisma } from '@/lib/prisma'

// GET /api/empresa/content/recursos → presentaciones/libros de SU empresa
export async function GET() {
  try {
    const auth = await getOrgAdmin()
    if (!auth) return unauthorizedOrg()
    const resources = await (prisma as any).resource.findMany({
      where: { organizationId: auth.organizationId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, tipo: true, titulo: true, categoria: true,
        archivoUrl: true, portadaUrl: true, paginas: true, activo: true,
        organizationId: true, createdAt: true,
      },
    })
    return NextResponse.json({ resources })
  } catch (e) {
    console.error('[GET /api/empresa/content/recursos]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// POST → crea un recurso privado de SU empresa (organizationId forzado en server)
export async function POST(req: Request) {
  try {
    const auth = await getOrgAdmin()
    if (!auth) return unauthorizedOrg()
    const body = await req.json().catch(() => ({}))
    const { tipo, titulo, categoria, archivoUrl, portadaUrl, paginas } = body || {}
    if (!['presentacion', 'libro'].includes(tipo)) {
      return NextResponse.json({ error: "tipo debe ser 'presentacion' o 'libro'" }, { status: 400 })
    }
    if (!titulo?.trim() || !categoria?.trim() || !archivoUrl?.trim()) {
      return NextResponse.json({ error: 'Título, categoría y archivo (PDF) son requeridos' }, { status: 400 })
    }
    const resource = await (prisma as any).resource.create({
      data: {
        tipo,
        titulo: titulo.trim(),
        categoria: categoria.trim(),
        archivoUrl: archivoUrl.trim(),
        portadaUrl: portadaUrl?.trim() || null,
        paginas: paginas ? parseInt(String(paginas)) || null : null,
        activo: true,
        creadoPor: (auth.user as any).id,
        organizationId: auth.organizationId,
      },
    })
    return NextResponse.json({ resource }, { status: 201 })
  } catch (e) {
    console.error('[POST /api/empresa/content/recursos]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
