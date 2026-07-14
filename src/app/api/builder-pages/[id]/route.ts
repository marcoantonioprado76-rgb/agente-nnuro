export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { deleteFileByUrl } from '@/lib/supabase'

/** Junta el contenido de una página (html + css + proyecto) en un solo texto para buscar URLs. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pageContent(p: { html?: string | null; css?: string | null; projectData?: any }): string {
  return [p.html || '', p.css || '', p.projectData ? JSON.stringify(p.projectData) : ''].join('\n')
}

/** Extrae las URLs de archivos subidos a NUESTRO S3 (amazonaws) que aparecen en el contenido. */
function extractUploadUrls(content: string): string[] {
  const all = content.match(/https?:\/\/[^\s"'<>()\\]+/g) || []
  return Array.from(new Set(all.filter(u => u.includes('.amazonaws.com/'))))
}

/**
 * Guarda de propiedad + servicio: solo devolvemos true si la URL apunta a un archivo dentro de
 * la subcarpeta del CONSTRUCTOR del propio usuario (`${userId}/landing/...`). Así el borrado NUNCA
 * toca archivos de otros servicios (productos, cursos, ads…) ni de otros usuarios, aunque en el
 * HTML hubiera una URL pegada de otro origen.
 */
function isLandingFileOfUser(url: string, userId: string): boolean {
  try {
    const u = new URL(url)
    const key = decodeURIComponent(u.pathname.replace(/^\//, ''))
    return key.startsWith(`${userId}/landing/`)
  } catch {
    return false
  }
}

/** GET /api/builder-pages/[id] — carga una página (solo el dueño) */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const page = await (prisma as any).builderPage.findFirst({
    where: { id: params.id, userId: user.id },
  })
  if (!page) return NextResponse.json({ error: 'Página no encontrada' }, { status: 404 })
  return NextResponse.json({ page })
}

/** PATCH /api/builder-pages/[id] — guarda html/css/proyecto/nombre/publicado (solo el dueño) */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const owned = await (prisma as any).builderPage.findFirst({
    where: { id: params.id, userId: user.id }, select: { id: true },
  })
  if (!owned) return NextResponse.json({ error: 'Página no encontrada' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const data: Record<string, unknown> = {}
  if (typeof body.html === 'string') data.html = body.html
  if (typeof body.css === 'string') data.css = body.css
  if (body.projectData !== undefined) data.projectData = body.projectData
  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim().slice(0, 80)
  if (typeof body.published === 'boolean') data.published = body.published

  const page = await (prisma as any).builderPage.update({
    where: { id: params.id }, data,
    select: { id: true, name: true, slug: true, published: true },
  })
  return NextResponse.json({ page })
}

/**
 * DELETE /api/builder-pages/[id] — elimina la página (solo el dueño) y TAMBIÉN sus imágenes/archivos
 * subidos al Storage. Salvaguarda: no borra un archivo si aparece usado en OTRA landing del mismo
 * usuario (para no romperla). Los leads se borran en cascada (ver schema).
 */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const page = await (prisma as any).builderPage.findFirst({
    where: { id: params.id, userId: user.id },
    select: { id: true, html: true, css: true, projectData: true },
  })
  if (!page) return NextResponse.json({ error: 'Página no encontrada' }, { status: 404 })

  // Archivos que usa ESTA página
  const urls = extractUploadUrls(pageContent(page))

  // Contenido de las OTRAS landings del usuario → para no borrar imágenes compartidas
  let othersContent = ''
  if (urls.length) {
    const others = await (prisma as any).builderPage.findMany({
      where: { userId: user.id, id: { not: page.id } },
      select: { html: true, css: true, projectData: true },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    othersContent = others.map((o: any) => pageContent(o)).join('\n')
  }

  // Borrar la página primero (lo esencial). La limpieza de archivos es best-effort.
  await (prisma as any).builderPage.delete({ where: { id: params.id } })

  // Solo borrar: (a) archivos de la subcarpeta landing del propio usuario y (b) que NO se usen en otra landing suya.
  const toDelete = urls.filter(u => isLandingFileOfUser(u, user.id) && !othersContent.includes(u))
  if (toDelete.length) {
    await Promise.allSettled(toDelete.map(u => deleteFileByUrl(u)))
  }

  return NextResponse.json({ success: true, removedFiles: toDelete.length })
}
