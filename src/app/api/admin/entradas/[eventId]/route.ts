export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { parseEventDate } from '@/lib/eventDate'

/** PATCH /api/admin/entradas/[eventId] */
export async function PATCH(req: NextRequest, { params }: { params: { eventId: string } }) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()
  try {
    const { title, description, image, date, location, active, paymentQrUrl } = await req.json()

    // Fecha: validada (una fecha inválida daba un "Error interno" sin explicación).
    let parsedDate: Date | null = null
    if (date !== undefined) {
      const p = parseEventDate(date)
      if (!p.ok) return NextResponse.json({ error: p.error }, { status: 400 })
      parsedDate = p.date
    }

    const event = await prisma.event.update({
      where: { id: params.eventId },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description: description.trim() }),
        ...(image !== undefined && { image: image?.trim() || null }),
        ...(paymentQrUrl !== undefined && { paymentQrUrl: paymentQrUrl?.trim() || null }),
        ...(date !== undefined && { date: parsedDate }),
        ...(location !== undefined && { location: location?.trim() || null }),
        ...(active !== undefined && { active }),
      },
      include: { ticketTypes: { orderBy: { sortOrder: 'asc' } } },
    })
    return NextResponse.json({ event: { ...event, ticketTypes: event.ticketTypes.map((tt: any) => ({ ...tt, price: Number(tt.price) })) } })
  } catch (err) {
    console.error('[PATCH /api/admin/entradas/[eventId]]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

/** DELETE /api/admin/entradas/[eventId] */
export async function DELETE(_req: NextRequest, { params }: { params: { eventId: string } }) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()
  try {
    await prisma.event.delete({ where: { id: params.eventId } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/admin/entradas/[eventId]]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
