export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

/** GET /api/admin/entradas/[eventId]/orders */
export async function GET(req: NextRequest, { params }: { params: { eventId: string } }) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const search = searchParams.get('search')?.trim()

  const tickets = await prisma.ticketOrder.findMany({
    where: {
      eventId: params.eventId,
      ...(status && status !== 'ALL' ? { status: status as any } : {}),
      ...(search ? {
        OR: [
          { ticketCode: { contains: search.toUpperCase() } },
          { customerEmail: { contains: search.toLowerCase() } },
          { customerName: { contains: search, mode: 'insensitive' } },
          { ticketTypeName: { contains: search, mode: 'insensitive' } },
        ],
      } : {}),
    },
    orderBy: { createdAt: 'desc' },
  })

  // Métricas del EVENTO COMPLETO (sin los filtros de la lista, para que el panel de
  // ventas siempre muestre el total real aunque estés filtrando o buscando).
  const all = await prisma.ticketOrder.findMany({
    where: { eventId: params.eventId },
    select: {
      status: true, totalPrice: true, totalBs: true, quantity: true,
      checkedIn: true, ticketTypeName: true, paymentMethod: true,
    },
  })

  // Los INVITADOS (gratis) NO son ventas: se cuentan aparte.
  const isGuestOrder = (t: { paymentMethod: string }) => t.paymentMethod === 'GUEST'
  const approved = all.filter(t => t.status === 'APPROVED')
  const sales = approved.filter(t => !isGuestOrder(t))
  const guests = approved.filter(isGuestOrder)
  const pendingOrders = all.filter(t => t.status === 'PENDING')

  // Ingresos: en USDT (la moneda base) y en Bs (con el tipo de cambio CONGELADO de
  // cada compra — así el total en bolivianos es el REAL cobrado, no uno recalculado).
  const usdOf = (rows: typeof all) => rows.reduce((n, t) => n + Number(t.totalPrice), 0)
  const bsOf = (rows: typeof all) => rows.reduce((n, t) => n + Number(t.totalBs ?? 0), 0)

  const byType: Record<string, { sold: number; usdt: number; bs: number }> = {}
  for (const t of sales) {
    const k = t.ticketTypeName
    if (!byType[k]) byType[k] = { sold: 0, usdt: 0, bs: 0 }
    byType[k].sold += t.quantity
    byType[k].usdt += Number(t.totalPrice)
    byType[k].bs += Number(t.totalBs ?? 0)
  }

  const soldQty = sales.reduce((n, t) => n + t.quantity, 0)

  const stats = {
    sold: soldQty,
    revenue: usdOf(sales),          // USDT (moneda base)
    revenueBs: bsOf(sales),         // Bs realmente cobrados (TC congelado)
    ticketAvg: soldQty > 0 ? usdOf(sales) / soldQty : 0,
    pending: pendingOrders.length,
    pendingRevenue: usdOf(pendingOrders), // plata que entra si aprobás lo pendiente
    rejected: all.filter(t => t.status === 'REJECTED').length,
    checkedIn: sales.filter(t => t.checkedIn).length,
    // Invitados (gratis): total y cuántos ya ingresaron.
    guests: guests.reduce((n, t) => n + t.quantity, 0),
    guestsCheckedIn: guests.filter(t => t.checkedIn).length,
    byType: Object.entries(byType)
      .map(([name, v]) => ({ name, sold: v.sold, revenue: v.usdt, revenueBs: v.bs }))
      .sort((a, b) => b.revenue - a.revenue),
  }

  return NextResponse.json({
    tickets: tickets.map(t => ({
      ...t,
      totalPrice: Number(t.totalPrice),
      unitPrice: Number(t.unitPrice),
    })),
    stats,
  })
}
