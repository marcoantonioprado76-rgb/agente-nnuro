export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { validateOrganizationId } from '@/lib/org-content'

function getAuth() {
  const cookieStore = cookies()
  const token = cookieStore.get('auth_token')?.value
  if (!token) return null
  return verifyToken(token)
}

async function requireAdmin(auth: ReturnType<typeof getAuth>) {
  if (!auth) return false
  const user = await prisma.user.findUnique({ where: { id: auth.userId }, select: { isAdmin: true } })
  return user?.isAdmin === true
}

/** PATCH /api/admin/courses/[courseId] — editar curso y sus videos */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const auth = getAuth()
    if (!await requireAdmin(auth)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const body = await req.json()
    const { title, description, coverUrl, price, active, freeForPlan, videos, categoria, nivel, organizationId } = body

    const org = await validateOrganizationId(organizationId)
    if (!org.ok) return NextResponse.json({ error: org.error }, { status: 400 })

    const data: any = {}
    if (title !== undefined) data.title = title
    if (description !== undefined) data.description = description
    if (coverUrl !== undefined) data.coverUrl = coverUrl || null
    if (price !== undefined) data.price = parseFloat(price)
    if (active !== undefined) data.active = active
    if (freeForPlan !== undefined) data.freeForPlan = freeForPlan === true
    if (categoria !== undefined) data.categoria = categoria || null
    if (nivel !== undefined) data.nivel = nivel || null
    if (!org.skip) data.organizationId = org.value

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
    console.error('[PATCH /api/admin/courses/[courseId]]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

/** DELETE /api/admin/courses/[courseId] — eliminar curso */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const auth = getAuth()
    if (!await requireAdmin(auth)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    await prisma.course.delete({ where: { id: params.courseId } })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/admin/courses/[courseId]]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
