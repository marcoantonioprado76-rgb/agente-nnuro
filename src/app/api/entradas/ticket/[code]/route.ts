/**
 * Entradas — La ENTRADA completa como imagen PNG (diseño + QR adentro).
 *
 * GET /api/entradas/ticket/[code].png        → muestra la entrada
 * GET /api/entradas/ticket/[code].png?d=1    → la DESCARGA (attachment)
 *
 * Se usa en el correo (imagen grande, no un QR enano) y en la página de la entrada,
 * donde el asistente la puede descargar y guardar en su celular.
 *
 * Es público a propósito: solo muestra la entrada; validarla/consumirla en la puerta
 * sigue requiriendo el panel de admin autenticado.
 */
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { renderTicketPng } from '@/lib/ticketImage'

/** "jue 30 jul · 11:00" (hora de Bolivia) */
function shortDate(d: Date | null): string {
  if (!d) return 'Fecha por confirmar'
  try {
    const day = d.toLocaleDateString('es-BO', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'America/La_Paz' }).replace(/\./g, '')
    const hr = d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/La_Paz' })
    return `${day} · ${hr}`
  } catch {
    return d.toISOString().slice(0, 16).replace('T', ' ')
  }
}

export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  // Se acepta con o sin extensión (".png").
  const code = (params.code ?? '').trim().replace(/\.(png|jpe?g)$/i, '')
  if (!code || code.length > 64 || !/^[A-Za-z0-9-]+$/.test(code)) {
    return NextResponse.json({ error: 'Código inválido' }, { status: 400 })
  }

  try {
    const order = await prisma.ticketOrder.findUnique({
      where: { ticketCode: code },
      select: {
        ticketCode: true, ticketTypeName: true, customerName: true,
        event: { select: { title: true, date: true, location: true } },
        ticketType: { select: { isGuest: true } },
      },
    })
    if (!order) return NextResponse.json({ error: 'Entrada no encontrada' }, { status: 404 })

    const png = await renderTicketPng({
      tierName: order.ticketTypeName,
      isGuest: order.ticketType?.isGuest === true,
      code: order.ticketCode,
      attendee: order.customerName,
      eventTitle: order.event.title,
      eventDate: shortDate(order.event.date),
      eventLocation: order.event.location || 'Por confirmar',
    })
    if (!png) return NextResponse.json({ error: 'No se pudo generar la entrada' }, { status: 500 })

    const download = req.nextUrl.searchParams.get('d') === '1'
    const filename = `entrada-${order.ticketCode}.png`

    return new NextResponse(png as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': String(png.length),
        'Cache-Control': 'public, max-age=86400',
        ...(download ? { 'Content-Disposition': `attachment; filename="${filename}"` } : {}),
      },
    })
  } catch (err) {
    console.error('[GET /api/entradas/ticket]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
