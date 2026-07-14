export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/notifications/read — marks one or all notifications as read
// Body: { id?: string }  — if omitted, marks all as read
export async function POST(req: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as { id?: string }

  if (body.id) {
    await prisma.notification.updateMany({
      where: { id: body.id, userId: user.id },
      data: { read: true },
    })
  } else {
    await prisma.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true },
    })
  }

  return NextResponse.json({ ok: true })
}
