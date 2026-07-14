export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getOrgAdmin, unauthorizedOrg } from '@/lib/org-auth'
import { prisma } from '@/lib/prisma'

/**
 * Verifica que el curso [courseId] pertenezca a la empresa del caller.
 * Devuelve true si el curso existe y su organizationId coincide.
 */
async function ownsCourse(courseId: string, organizationId: string): Promise<boolean> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { organizationId: true },
  })
  return !!course && course.organizationId === organizationId
}

/**
 * PATCH /api/empresa/content/courses/[courseId]
 * Edita un curso de la empresa del admin (videos, etc.). NUNCA cambia organizationId.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const ctx = await getOrgAdmin()
    if (!ctx) return unauthorizedOrg()
    const { organizationId } = ctx

    // Ownership por empresa: el curso debe ser de SU empresa.
    if (!(await ownsCourse(params.courseId, organizationId))) {
      return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 })
    }

    const body = await req.json()
    const { title, description, coverUrl, price, active, freeForPlan, videos, categoria, nivel } = body

    const data: any = {}
    if (title !== undefined) data.title = title
    if (description !== undefined) data.description = description
    if (coverUrl !== undefined) data.coverUrl = coverUrl || null
    if (price !== undefined) data.price = parseFloat(price)
    if (active !== undefined) data.active = active
    if (freeForPlan !== undefined) data.freeForPlan = freeForPlan === true
    if (categoria !== undefined) data.categoria = categoria || null
    if (nivel !== undefined) data.nivel = nivel || null
    // organizationId NUNCA se cambia: el curso queda atado a su empresa.

    // Replace all videos if provided
    if (Array.isArray(videos)) {
      data.videos = {
        deleteMany: {},
        create: videos
          .filter((v: any) => v.title && (v.youtubeUrl || v.videoUrl))
          .map((v: any, i: number) => ({
            title: v.title,
            youtubeUrl: v.youtubeUrl || '',
            videoUrl: v.videoUrl || null,
            preview: v.preview === true,
            descripcion: v.descripcion || null,
            duracionSegundos: typeof v.duracionSegundos === 'number' ? v.duracionSegundos : null,
            moduloTitulo: v.moduloTitulo || null,
            order: i,
            recursos: {
              create: Array.isArray(v.recursos)
                ? v.recursos.filter((r: any) => r.titulo && r.archivoUrl).map((r: any, j: number) => ({ titulo: r.titulo, archivoUrl: r.archivoUrl, orden: j }))
                : [],
            },
          })),
      }
    }

    const course = await prisma.course.update({
      where: { id: params.courseId },
      data,
      include: { videos: { orderBy: { order: 'asc' } } },
    })

    return NextResponse.json({ course })
  } catch (err) {
    console.error('[PATCH /api/empresa/content/courses/[courseId]]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

/**
 * DELETE /api/empresa/content/courses/[courseId]
 * Elimina un curso de la empresa del admin (misma cascada que el admin route).
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const ctx = await getOrgAdmin()
    if (!ctx) return unauthorizedOrg()
    const { organizationId } = ctx

    // Ownership por empresa: el curso debe ser de SU empresa.
    if (!(await ownsCourse(params.courseId, organizationId))) {
      return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 })
    }

    await prisma.course.delete({ where: { id: params.courseId } })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/empresa/content/courses/[courseId]]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
