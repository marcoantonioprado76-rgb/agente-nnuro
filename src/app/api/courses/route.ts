export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { contentOrgWhere } from '@/lib/org-content'

/** GET /api/courses — lista cursos activos con estado de inscripción del usuario */
export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const hasPlan = user.plan !== 'NONE'
    const orgWhere = await contentOrgWhere(user.id)

    const courses = await prisma.course.findMany({
      where: { ...orgWhere, active: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        coverUrl: true,
        price: true,
        freeForPlan: true,
        categoria: true,
        nivel: true,
        createdAt: true,
        _count: { select: { videos: true } },
        enrollments: {
          where: { userId: user.id },
          select: { status: true },
        },
      },
    })

    const result = courses.map(c => ({
      id: c.id,
      title: c.title,
      description: c.description,
      coverUrl: c.coverUrl,
      price: Number(c.price),
      freeForPlan: c.freeForPlan,
      categoria: (c as any).categoria ?? null,
      nivel: (c as any).nivel ?? null,
      videosCount: c._count.videos,
      createdAt: c.createdAt,
      locked: !hasPlan,
      enrollment: c.enrollments[0] ?? null,
    }))

    return NextResponse.json({ courses: result, hasPlan })
  } catch (err) {
    console.error('[GET /api/courses]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
