export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { parseEventDate } from '@/lib/eventDate'

/** GET /api/admin/entradas — list all events with ticket types */
export async function GET() {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const events = await prisma.event.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      ticketTypes: { orderBy: { sortOrder: 'asc' } },
      _count: { select: { tickets: true } },
    },
  })

  return NextResponse.json({
    events: events.map(e => ({
      id: e.id,
      title: e.title,
      description: e.description,
      image: e.image,
      paymentQrUrl: e.paymentQrUrl,
      date: e.date,
      location: e.location,
      active: e.active,
      createdAt: e.createdAt,
      ticketCount: e._count.tickets,
      ticketTypes: e.ticketTypes.map(tt => ({ ...tt, price: Number(tt.price) })),
    })),
  })
}

/** POST /api/admin/entradas — create event */
export async function POST(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  try {
    const { title, description, image, date, location, active, paymentQrUrl } = await req.json()
    if (!title?.trim()) return NextResponse.json({ error: 'Título requerido' }, { status: 400 })

    // Fecha: validada (una fecha inválida daba un "Error interno" sin explicación).
    const parsedDate = parseEventDate(date)
    if (!parsedDate.ok) return NextResponse.json({ error: parsedDate.error }, { status: 400 })

    const event = await prisma.event.create({
      data: {
        title: title.trim(),
        description: description?.trim() ?? '',
        image: image?.trim() || null,
        paymentQrUrl: paymentQrUrl?.trim() || null,
        date: parsedDate.date,
        location: location?.trim() || null,
        active: active !== false,
      },
      include: { ticketTypes: true },
    })

    return NextResponse.json({ event: { ...event, ticketTypes: event.ticketTypes.map(tt => ({ ...tt, price: Number(tt.price) })) } }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/admin/entradas]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
