export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/** GET /api/entradas/[eventId] — public event details with ticket types */
export async function GET(
  _req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const event = await prisma.event.findUnique({
      where: { id: params.eventId, active: true },
      include: {
        ticketTypes: {
          where: { active: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    })

    if (!event) return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })
    if (!event.ticketTypes.length) return NextResponse.json({ error: 'Este evento no tiene entradas disponibles' }, { status: 404 })

    // For each type, compute sold count and availability
    const typesWithAvailability = await Promise.all(
      event.ticketTypes.map(async (tt) => {
        const sold = await prisma.ticketOrder.aggregate({
          _sum: { quantity: true },
          where: { ticketTypeId: tt.id, status: { not: 'REJECTED' } },
        })
        const soldQty = sold._sum.quantity ?? 0
        const available = tt.capacity != null ? tt.capacity - soldQty : null
        return {
          id: tt.id,
          name: tt.name,
          description: tt.description,
          image: tt.image,
          price: Number(tt.price),
          isGuest: tt.isGuest,
          bulkMinQty: tt.bulkMinQty,
          bulkDiscountPct: tt.bulkDiscountPct ? Number(tt.bulkDiscountPct) : null,
          capacity: tt.capacity,
          available,
          soldOut: available !== null && available <= 0,
        }
      })
    )

    return NextResponse.json({
      event: {
        id: event.id,
        title: event.title,
        description: event.description,
        image: event.image,
        date: event.date,
        location: event.location,
        // QR bancario para pagar por transferencia (pago manual).
        paymentQrUrl: event.paymentQrUrl,
        ticketTypes: typesWithAvailability,
      },
    })
  } catch (err) {
    console.error('[GET /api/entradas/[eventId]]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
