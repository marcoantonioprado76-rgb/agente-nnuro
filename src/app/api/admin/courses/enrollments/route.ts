export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

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

/** GET /api/admin/courses/enrollments — lista inscripciones, filtro por status */
export async function GET(req: NextRequest) {
  try {
    const auth = getAuth()
    if (!await requireAdmin(auth)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')

    const where: any = {}
    if (status && ['PENDING', 'PENDING_VERIFICATION', 'APPROVED', 'REJECTED'].includes(status)) {
      where.status = status
    }

    const enrollments = await prisma.courseEnrollment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, username: true, fullName: true, email: true } },
        course: { select: { id: true, title: true, price: true } },
      },
    })

    return NextResponse.json({ enrollments })
  } catch (err) {
    console.error('[GET /api/admin/courses/enrollments]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
