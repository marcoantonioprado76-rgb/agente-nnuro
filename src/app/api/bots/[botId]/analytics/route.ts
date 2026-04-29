export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: Request, { params }: { params: { botId: string } }) {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const bot = await (prisma as any).bot.findFirst({
    where: { id: params.botId, tenant_id: session.sub },
    select: { id: true, name: true },
  })
  if (!bot) return NextResponse.json({ error: 'Bot no encontrado' }, { status: 404 })

  const { botId } = params

  // Bolivia = UTC-4
  const TZ_OFFSET_MS = -4 * 60 * 60 * 1000

  function startOfDayBolivia(daysAgo = 0): Date {
    const now = new Date(Date.now() + TZ_OFFSET_MS)
    now.setUTCHours(0, 0, 0, 0)
    now.setUTCDate(now.getUTCDate() - daysAgo)
    return new Date(now.getTime() - TZ_OFFSET_MS)
  }

  const since = startOfDayBolivia(29)

  const [allConversations, soldConversations, totalConversations, totalSales] = await Promise.all([
    (prisma as any).conversation.findMany({
      where: { bot_id: botId, created_at: { gte: since } },
      select: { created_at: true, sold_at: true },
    }),
    (prisma as any).conversation.findMany({
      where: { bot_id: botId, sold: true },
      select: {
        sold_at: true, user_name: true, user_phone: true,
        messages: { where: { role: 'assistant' }, orderBy: { created_at: 'desc' } },
      },
      orderBy: { sold_at: 'desc' },
      take: 50,
    }),
    (prisma as any).conversation.count({ where: { bot_id: botId } }),
    (prisma as any).conversation.count({ where: { bot_id: botId, sold: true } }),
  ])

  const days = Array.from({ length: 30 }, (_, idx) => {
    const d    = startOfDayBolivia(29 - idx)
    const dEnd = new Date(d.getTime() + 24 * 60 * 60 * 1000 - 1)
    const labelDate = new Date(d.getTime() + TZ_OFFSET_MS)
    const dateStr   = labelDate.toISOString().slice(0, 10)
    return {
      date: dateStr,
      conversations: allConversations.filter((c: any) => { const cd = new Date(c.created_at); return cd >= d && cd <= dEnd }).length,
      sales: allConversations.filter((c: any) => { if (!c.sold_at) return false; const sd = new Date(c.sold_at); return sd >= d && sd <= dEnd }).length,
    }
  })

  const today   = startOfDayBolivia(0)
  const weekAgo = startOfDayBolivia(7)

  const salesToday    = soldConversations.filter((c: any) => c.sold_at && new Date(c.sold_at) >= today).length
  const salesThisWeek = soldConversations.filter((c: any) => c.sold_at && new Date(c.sold_at) >= weekAgo).length
  const conversionRate = totalConversations > 0 ? Math.round((totalSales / totalConversations) * 100) : 0

  const recentSales = soldConversations.slice(0, 20).map((c: any) => {
    let reporte = ''
    for (const msg of c.messages) {
      try { const p = JSON.parse(msg.content); if (p.reporte?.trim()) { reporte = p.reporte; break } } catch { /* ignore */ }
    }
    return { userName: c.user_name || null, userPhone: c.user_phone, soldAt: c.sold_at, reporte }
  })

  return NextResponse.json({
    botName: bot.name,
    stats: { totalConversations, totalSales, salesToday, salesThisWeek, conversionRate },
    days,
    recentSales,
  })
}

export async function DELETE(_req: Request, { params }: { params: { botId: string } }) {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const bot = await (prisma as any).bot.findFirst({
    where: { id: params.botId, tenant_id: session.sub },
    select: { id: true },
  })
  if (!bot) return NextResponse.json({ error: 'Bot no encontrado' }, { status: 404 })

  await (prisma as any).conversation.deleteMany({ where: { bot_id: params.botId } })
  return NextResponse.json({ ok: true })
}
