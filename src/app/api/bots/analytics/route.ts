export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value
  if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const user = verifyToken(token)
  if (!user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

  // Todos los bots del usuario
  const bots = await prisma.bot.findMany({
    where: { userId: user.userId, isReto: false },
    select: { id: true },
  })
  const botIds = bots.map(b => b.id)

  // Bolivia = UTC-4
  const TZ_OFFSET_MS = -4 * 60 * 60 * 1000

  function startOfDayBolivia(daysAgo = 0): Date {
    const now = new Date(Date.now() + TZ_OFFSET_MS)
    now.setUTCHours(0, 0, 0, 0)
    now.setUTCDate(now.getUTCDate() - daysAgo)
    return new Date(now.getTime() - TZ_OFFSET_MS)
  }

  if (botIds.length === 0) {
    const empty = Array.from({ length: 30 }, (_, i) => {
      const d = startOfDayBolivia(29 - i)
      const dateStr = new Date(d.getTime() + TZ_OFFSET_MS).toISOString().slice(0, 10)
      return { date: dateStr, conversations: 0, sales: 0 }
    })
    return NextResponse.json({ days: empty, totalConversations: 0, totalSales: 0 })
  }

  const since = startOfDayBolivia(29)

  const [allConv, totalConversations, totalSales] = await Promise.all([
    prisma.conversation.findMany({
      where: { botId: { in: botIds }, createdAt: { gte: since } },
      select: { createdAt: true, soldAt: true },
    }),
    prisma.conversation.count({ where: { botId: { in: botIds } } }),
    prisma.conversation.count({ where: { botId: { in: botIds }, sold: true } }),
  ])

  const days = Array.from({ length: 30 }, (_, idx) => {
    const d = startOfDayBolivia(29 - idx)
    const dEnd = new Date(d.getTime() + 24 * 60 * 60 * 1000 - 1)
    const date = new Date(d.getTime() + TZ_OFFSET_MS).toISOString().slice(0, 10)

    const conversations = allConv.filter(c => {
      const cd = new Date(c.createdAt)
      return cd >= d && cd <= dEnd
    }).length

    const sales = allConv.filter(c => {
      if (!c.soldAt) return false
      const sd = new Date(c.soldAt)
      return sd >= d && sd <= dEnd
    }).length

    return { date, conversations, sales }
  })

  return NextResponse.json({ days, totalConversations, totalSales })
}
