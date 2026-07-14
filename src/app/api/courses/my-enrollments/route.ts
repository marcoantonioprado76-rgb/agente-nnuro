export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

// GET /api/courses/my-enrollments — inscripciones del usuario en cursos del admin
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const raw = await prisma.courseEnrollment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            description: true,
            coverUrl: true,
            price: true,
            freeForPlan: true,
            _count: { select: { videos: true } },
          },
        },
      },
    })

    // Convertir Decimal a number para evitar error de serialización en JSON
    const enrollments = raw.map(e => ({
      ...e,
      course: { ...e.course, price: Number(e.course.price) },
    }))

    return NextResponse.json({ enrollments })
  } catch (err) {
    console.error('[GET /api/courses/my-enrollments]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
