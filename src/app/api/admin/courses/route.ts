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

/** GET /api/admin/courses — lista todos los cursos */
export async function GET() {
  try {
    const auth = getAuth()
    if (!await requireAdmin(auth)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const courses = await prisma.course.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        videos: { orderBy: { order: 'asc' }, include: { recursos: { orderBy: { orden: 'asc' } } } },
        _count: { select: { videos: true, enrollments: true } },
      },
    })

    return NextResponse.json({ courses })
  } catch (err) {
    console.error('[GET /api/admin/courses]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

/** POST /api/admin/courses — crear curso con videos opcionales */
export async function POST(req: NextRequest) {
  try {
    const auth = getAuth()
    if (!await requireAdmin(auth)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const body = await req.json()
    const { title, description, coverUrl, price, freeForPlan, videos, categoria, nivel, organizationId } = body

    if (!title || !description || price === undefined) {
      return NextResponse.json({ error: 'title, description y price son requeridos' }, { status: 400 })
    }

    const parsedPrice = parseFloat(price)
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return NextResponse.json({ error: 'Precio inválido' }, { status: 400 })
    }

    const org = await validateOrganizationId(organizationId)
    if (!org.ok) return NextResponse.json({ error: org.error }, { status: 400 })

    const course = await prisma.course.create({
      data: {
        title,
        description,
        coverUrl: coverUrl || null,
        price: parsedPrice,
        freeForPlan: freeForPlan === true,
        categoria: categoria || null,
        nivel: nivel || null,
        organizationId: org.skip ? null : org.value,
        active: true,
        videos: {
          create: Array.isArray(videos)
            ? videos
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
                }))
            : [],
        },
      },
      include: { videos: { orderBy: { order: 'asc' } } },
    })

    return NextResponse.json({ course }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/admin/courses]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
