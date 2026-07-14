export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/** GET /api/entradas/list — list active events with ticket types for dashboard store */
export async function GET() {
  try {
    const events = await prisma.event.findMany({
      where: { active: true },
      orderBy: { date: 'asc' },
      include: {
        ticketTypes: {
          where: { active: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    })

    // Filter events that have at least one active ticket type
    const filtered = events.filter(e => e.ticketTypes.length > 0)

    // For each ticket type compute sold + availability
    const result = await Promise.all(
      filtered.map(async (ev) => {
        const types = await Promise.all(
          ev.ticketTypes.map(async (tt) => {
            const sold = await prisma.ticketOrder.aggregate({
              _sum: { quantity: true },
              where: { ticketTypeId: tt.id, status: { not: 'REJECTED' } },
            })
            const soldQty = sold._sum.quantity ?? 0
            const available = tt.capacity != null ? tt.capacity - soldQty : null
            return {
              id: tt.id,
              name: tt.name,
              price: Number(tt.price),
              isGuest: tt.isGuest,
              available,
              soldOut: available !== null && available <= 0,
            }
          })
        )
        return {
          id: ev.id,
          title: ev.title,
          description: ev.description,
          image: ev.image,
          date: ev.date,
          location: ev.location,
          ticketTypes: types,
        }
      })
    )

    return NextResponse.json({ events: result })
  } catch (err) {
    console.error('[GET /api/entradas/list]', err)
    return NextResponse.json({ events: [] })
  }
}
