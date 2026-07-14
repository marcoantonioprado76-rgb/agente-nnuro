export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getOrgAdmin, unauthorizedOrg } from '@/lib/org-auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/empresa/content/courses
 * Lista los cursos de la organización del admin de empresa (Pack Empresarial Fase 3b).
 * Mismo shape que el GET admin/lista, pero filtrado a `organizationId` del caller.
 */
export async function GET() {
  try {
    const ctx = await getOrgAdmin()
    if (!ctx) return unauthorizedOrg()
    const { organizationId } = ctx

    const courses = await prisma.course.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      include: {
        videos: { orderBy: { order: 'asc' }, include: { recursos: { orderBy: { orden: 'asc' } } } },
        _count: { select: { videos: true, enrollments: true } },
      },
    })

    return NextResponse.json({ courses })
  } catch (err) {
    console.error('[GET /api/empresa/content/courses]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

/**
 * POST /api/empresa/content/courses
 * Crea un curso etiquetado a la empresa del admin (organizationId FORZADO en server).
 * Replica el create del admin, pero ignora cualquier organizationId del body.
 */
export async function POST(req: NextRequest) {
  try {
    const ctx = await getOrgAdmin()
    if (!ctx) return unauthorizedOrg()
    const { organizationId } = ctx

    const body = await req.json()
    const { title, description, coverUrl, price, freeForPlan, videos, categoria, nivel } = body

    if (!title || !description || price === undefined) {
      return NextResponse.json({ error: 'title, description y price son requeridos' }, { status: 400 })
    }

    const parsedPrice = parseFloat(price)
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return NextResponse.json({ error: 'Precio inválido' }, { status: 400 })
    }

    const course = await prisma.course.create({
      data: {
        title,
        description,
        coverUrl: coverUrl || null,
        price: parsedPrice,
        freeForPlan: freeForPlan === true,
        categoria: categoria || null,
        nivel: nivel || null,
        organizationId, // FORZADO a la empresa del caller; nunca leído del body
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
    console.error('[POST /api/empresa/content/courses]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
