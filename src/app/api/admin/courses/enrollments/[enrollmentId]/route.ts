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

/** PATCH /api/admin/courses/enrollments/[enrollmentId] — aprobar o rechazar */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { enrollmentId: string } }
) {
  try {
    const auth = getAuth()
    if (!await requireAdmin(auth)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const { action, notes } = await req.json()

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'action debe ser approve o reject' }, { status: 400 })
    }

    const enrollment = await prisma.courseEnrollment.update({
      where: { id: params.enrollmentId },
      data: {
        status: (action === 'approve' ? 'APPROVED' : 'REJECTED') as any,
        notes: notes || null,
      },
    })

    return NextResponse.json({ enrollment })
  } catch (err) {
    console.error('[PATCH /api/admin/courses/enrollments/[enrollmentId]]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
