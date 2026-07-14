export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { sendTicketGroupEmail } from '@/lib/email'
import { sendTicketsWhatsapp } from '@/lib/entradasWhatsapp'

/** PATCH /api/admin/entradas/tickets/[ticketId]
 * body: { action: 'approve' | 'reject' | 'checkin', notes? }
 */
export async function PATCH(req: NextRequest, { params }: { params: { ticketId: string } }) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  try {
    const { action, notes } = await req.json()
    if (!['approve', 'reject', 'checkin'].includes(action)) {
      return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
    }

    const ticket = await prisma.ticketOrder.findUnique({
      where: { id: params.ticketId },
      include: {
        event: true,
        ticketType: { select: { image: true } },
      },
    })
    if (!ticket) return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 })

    if (action === 'checkin') {
      if (ticket.status !== 'APPROVED') {
        return NextResponse.json({ error: 'El ticket no está aprobado' }, { status: 400 })
      }
      if (ticket.checkedIn) {
        return NextResponse.json({ error: 'Este ticket ya fue utilizado', checkedInAt: ticket.checkedInAt }, { status: 409 })
      }
      await prisma.ticketOrder.update({
        where: { id: params.ticketId },
        data: { checkedIn: true, checkedInAt: new Date() },
      })
      return NextResponse.json({ ok: true, action: 'checkin' })
    }

    if (action === 'approve') {
      if (ticket.status === 'APPROVED') {
        return NextResponse.json({ error: 'Ya está aprobado' }, { status: 400 })
      }

      // Find ALL tickets in the same purchase group to send emails for all
      const siblings = ticket.purchaseGroupId
        ? await prisma.ticketOrder.findMany({
            where: { purchaseGroupId: ticket.purchaseGroupId },
          })
        : [ticket]

      // Approve only the ones not yet approved (idempotent)
      await prisma.ticketOrder.updateMany({
        where: {
          id: { in: siblings.map(s => s.id) },
          status: { not: 'APPROVED' },
        },
        data: { status: 'APPROVED', notes: notes || null },
      })

      // Send one combined email with all codes
      const typeImage = (ticket.ticketType as any)?.image ?? ticket.event.image
      const totalPaid = siblings.reduce((sum, s) => sum + Number(s.totalPrice), 0)
      const eventInfo = { title: ticket.event.title, date: ticket.event.date, location: ticket.event.location }
      sendTicketGroupEmail(
        siblings[0].customerEmail,
        siblings[0].customerName,
        eventInfo,
        siblings.map(s => ({
          ticketCode: s.ticketCode,
          typeName: s.ticketTypeName,
          typeImage,
        })),
        totalPaid
      ).catch(e => console.error('[email] approve group:', e))

      // La entrada TAMBIÉN por WhatsApp con su QR (es lo que la gente realmente abre).
      sendTicketsWhatsapp(
        siblings[0].customerPhone,
        siblings[0].customerName,
        eventInfo,
        siblings.map(s => ({ ticketCode: s.ticketCode, ticketTypeName: s.ticketTypeName })),
      )
        .then((ok) => {
          if (ok) {
            prisma.ticketOrder
              .updateMany({ where: { id: { in: siblings.map(s => s.id) } }, data: { waSentAt: new Date() } })
              .catch(e => console.error('[entradas] marcar waSentAt:', e))
          }
        })
        .catch(e => console.error('[entradas] WhatsApp entrada (approve):', e))

      return NextResponse.json({ ok: true, action: 'approve', approvedCount: siblings.length })
    }

    if (action === 'reject') {
      // Only reject tickets that are not yet approved (never undo an already-approved ticket)
      const groupIds = ticket.purchaseGroupId
        ? await prisma.ticketOrder.findMany({
            where: { purchaseGroupId: ticket.purchaseGroupId, status: { not: 'APPROVED' } },
            select: { id: true },
          }).then(rows => rows.map(r => r.id))
        : ticket.status !== 'APPROVED' ? [ticket.id] : []

      if (groupIds.length === 0) {
        return NextResponse.json({ error: 'No se puede rechazar: todos los tickets del grupo ya fueron aprobados' }, { status: 409 })
      }

      await prisma.ticketOrder.updateMany({
        where: { id: { in: groupIds } },
        data: { status: 'REJECTED', notes: notes || null },
      })
      return NextResponse.json({ ok: true, action: 'reject', rejectedCount: groupIds.length })
    }

    return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
  } catch (err) {
    console.error('[PATCH /api/admin/entradas/tickets/[ticketId]]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
