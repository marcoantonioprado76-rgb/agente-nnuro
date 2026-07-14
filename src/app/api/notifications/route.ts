export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/notifications — returns last 20 notifications for the logged-in user
export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  const unreadCount = notifications.filter(n => !n.read).length

  return NextResponse.json({ notifications, unreadCount })
}
