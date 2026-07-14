export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: Request,
  { params }: { params: { botId: string } }
) {
  const cookieStore = cookies()
  const token = cookieStore.get('auth_token')?.value
  if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const user = verifyToken(token)
  if (!user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

  const { botId } = params

  const bot = await prisma.bot.findFirst({ where: { id: botId, userId: user.userId } })
  if (!bot) return NextResponse.json({ error: 'Bot no encontrado' }, { status: 404 })

  // Bolivia = UTC-4. Todas las fechas se calculan en hora local boliviana.
  const TZ_OFFSET_MS = -4 * 60 * 60 * 1000

  // Inicio del día actual en Bolivia (medianoche local)
  function startOfDayBolivia(daysAgo = 0): Date {
    const now = new Date(Date.now() + TZ_OFFSET_MS)
    now.setUTCHours(0, 0, 0, 0)
    now.setUTCDate(now.getUTCDate() - daysAgo)
    // Convertir de vuelta a UTC real
    return new Date(now.getTime() - TZ_OFFSET_MS)
  }

  const since = startOfDayBolivia(29)

  const [allConversations, soldConversations, totalConversations, totalSales] = await Promise.all([
    prisma.conversation.findMany({
      where: { botId, createdAt: { gte: since } },
      select: { createdAt: true, soldAt: true },
    }),
    prisma.conversation.findMany({
      where: { botId, sold: true },
      select: {
        soldAt: true, userName: true, userPhone: true,
        messages: { where: { role: 'assistant' }, orderBy: { createdAt: 'desc' } },
      },
      orderBy: { soldAt: 'desc' },
      take: 50,
    }),
    prisma.conversation.count({ where: { botId } }),
    prisma.conversation.count({ where: { botId, sold: true } }),
  ])

  // 30-day chart data en hora boliviana
  const days = Array.from({ length: 30 }, (_, idx) => {
    const d = startOfDayBolivia(29 - idx)
    const dEnd = new Date(d.getTime() + 24 * 60 * 60 * 1000 - 1)
    // Fecha en formato Bolivia para la etiqueta
    const labelDate = new Date(d.getTime() + TZ_OFFSET_MS)
    const dateStr = labelDate.toISOString().slice(0, 10)
    return {
      date: dateStr,
      conversations: allConversations.filter(c => { const cd = new Date(c.createdAt); return cd >= d && cd <= dEnd }).length,
      sales: allConversations.filter(c => { if (!c.soldAt) return false; const sd = new Date(c.soldAt); return sd >= d && sd <= dEnd }).length,
    }
  })

  const today = startOfDayBolivia(0)
  const weekAgo = startOfDayBolivia(7)

  const salesToday = soldConversations.filter(c => c.soldAt && new Date(c.soldAt) >= today).length
  const salesThisWeek = soldConversations.filter(c => c.soldAt && new Date(c.soldAt) >= weekAgo).length
  const conversionRate = totalConversations > 0 ? Math.round((totalSales / totalConversations) * 100) : 0

  // Extract reporte from messages
  const recentSales = soldConversations.slice(0, 20).map(c => {
    let reporte = ''
    for (const msg of c.messages) {
      try {
        const p = JSON.parse(msg.content)
        if (p.reporte?.trim()) { reporte = p.reporte; break }
      } catch { /* ignore */ }
    }
    return {
      userName: c.userName || null,
      userPhone: c.userPhone,
      soldAt: c.soldAt,
      reporte,
    }
  })

  return NextResponse.json({
    botName: bot.name,
    stats: { totalConversations, totalSales, salesToday, salesThisWeek, conversionRate },
    days,
    recentSales,
  })
}

export async function DELETE(
  _req: Request,
  { params }: { params: { botId: string } }
) {
  const cookieStore = cookies()
  const token = cookieStore.get('auth_token')?.value
  if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const user = verifyToken(token)
  if (!user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

  const { botId } = params

  const bot = await prisma.bot.findFirst({ where: { id: botId, userId: user.userId } })
  if (!bot) return NextResponse.json({ error: 'Bot no encontrado' }, { status: 404 })

  await prisma.conversation.deleteMany({ where: { botId } })

  return NextResponse.json({ ok: true })
}
