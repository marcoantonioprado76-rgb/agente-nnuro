/**
 * Entradas — REPORTE de ventas descargable (CSV, se abre en Excel).
 *
 * GET /api/admin/entradas/[eventId]/report
 *
 * Devuelve el detalle EXACTO de todas las entradas del evento: quién compró, qué
 * tipo, cuánto pagó (en USDT y en Bs con el tipo de cambio CONGELADO de esa compra),
 * cómo pagó, si ya ingresó, etc. Arriba lleva un resumen con los totales.
 *
 * Se genera con BOM (﻿) y separador ";" para que Excel en español lo abra bien
 * (acentos correctos y columnas separadas).
 */
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

const STATUS_ES: Record<string, string> = {
  PENDING: 'Pendiente', APPROVED: 'Aprobado', REJECTED: 'Rechazado',
}
const PAY_ES: Record<string, string> = {
  MANUAL: 'Transferencia/QR', CRYPTO: 'USDT (cripto)', GUEST: 'Invitado (gratis)',
}

/** Escapa un valor para CSV (comillas y separador). */
function csv(value: unknown): string {
  const s = String(value ?? '')
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Fecha legible en hora de Bolivia. */
function fmt(d: Date | null | undefined): string {
  if (!d) return ''
  try {
    return new Intl.DateTimeFormat('es-BO', {
      timeZone: 'America/La_Paz', day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(d)
  } catch {
    return d.toISOString()
  }
}

export async function GET(_req: NextRequest, { params }: { params: { eventId: string } }) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  try {
    const event = await prisma.event.findUnique({
      where: { id: params.eventId },
      select: { title: true, date: true, location: true },
    })
    if (!event) return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })

    const orders = await prisma.ticketOrder.findMany({
      where: { eventId: params.eventId },
      orderBy: { createdAt: 'asc' },
      select: {
        ticketCode: true, ticketTypeName: true, customerName: true, customerEmail: true,
        customerPhone: true, quantity: true, unitPrice: true, totalPrice: true,
        totalBs: true, bsRate: true, paymentMethod: true, status: true,
        checkedIn: true, checkedInAt: true, createdAt: true, notes: true,
      },
    })

    // ── Totales (los invitados NO son ventas) ────────────────────────────────
    const approved = orders.filter(o => o.status === 'APPROVED')
    const sales = approved.filter(o => o.paymentMethod !== 'GUEST')
    const guests = approved.filter(o => o.paymentMethod === 'GUEST')
    const pending = orders.filter(o => o.status === 'PENDING')

    const sum = (rows: typeof orders, f: (o: typeof orders[number]) => number) =>
      rows.reduce((n, o) => n + f(o), 0)

    const soldQty = sum(sales, o => o.quantity)
    const usdt = sum(sales, o => Number(o.totalPrice))
    const bs = sum(sales, o => Number(o.totalBs ?? 0))

    const L: string[] = []
    L.push(`REPORTE DE ENTRADAS`)
    L.push(`Evento;${csv(event.title)}`)
    L.push(`Fecha del evento;${csv(fmt(event.date))}`)
    L.push(`Lugar;${csv(event.location ?? '')}`)
    L.push(`Reporte generado;${csv(fmt(new Date()))}`)
    L.push('')
    L.push(`RESUMEN`)
    L.push(`Entradas vendidas;${soldQty}`)
    L.push(`Ingresos (USDT);${usdt.toFixed(2)}`)
    L.push(`Ingresos (Bs);${bs.toFixed(2)}`)
    L.push(`Ticket promedio (USDT);${soldQty > 0 ? (usdt / soldQty).toFixed(2) : '0.00'}`)
    L.push(`Compras por aprobar;${pending.length}`)
    L.push(`Por cobrar si aprobas (USDT);${sum(pending, o => Number(o.totalPrice)).toFixed(2)}`)
    L.push(`Rechazadas;${orders.filter(o => o.status === 'REJECTED').length}`)
    L.push(`Ingresaron (check-in);${sales.filter(o => o.checkedIn).length} de ${soldQty}`)
    L.push(`Invitados (gratis);${sum(guests, o => o.quantity)}`)
    L.push(`Invitados que ingresaron;${guests.filter(o => o.checkedIn).length}`)
    L.push('')

    // Desglose por tipo de entrada.
    const byType = new Map<string, { qty: number; usdt: number; bs: number }>()
    for (const o of sales) {
      const k = o.ticketTypeName
      const e = byType.get(k) ?? { qty: 0, usdt: 0, bs: 0 }
      e.qty += o.quantity
      e.usdt += Number(o.totalPrice)
      e.bs += Number(o.totalBs ?? 0)
      byType.set(k, e)
    }
    L.push(`VENTAS POR TIPO DE ENTRADA`)
    L.push(`Tipo;Vendidas;Ingresos (USDT);Ingresos (Bs)`)
    for (const [name, v] of Array.from(byType.entries())) {
      L.push(`${csv(name)};${v.qty};${v.usdt.toFixed(2)};${v.bs.toFixed(2)}`)
    }
    L.push('')

    // ── Detalle entrada por entrada ──────────────────────────────────────────
    L.push(`DETALLE DE ENTRADAS`)
    L.push([
      'Codigo', 'Tipo', 'Nombre', 'Email', 'Telefono', 'Cantidad',
      'Precio unit. (USDT)', 'Total (USDT)', 'Total (Bs)', 'Tipo de cambio',
      'Forma de pago', 'Estado', 'Ingreso (check-in)', 'Hora de ingreso',
      'Fecha de compra', 'Notas',
    ].join(';'))

    for (const o of orders) {
      L.push([
        csv(o.ticketCode),
        csv(o.ticketTypeName),
        csv(o.customerName),
        csv(o.customerEmail),
        csv(o.customerPhone),
        o.quantity,
        Number(o.unitPrice).toFixed(2),
        Number(o.totalPrice).toFixed(2),
        o.totalBs != null ? Number(o.totalBs).toFixed(2) : '',
        o.bsRate != null ? Number(o.bsRate).toFixed(2) : '',
        csv(PAY_ES[o.paymentMethod] ?? o.paymentMethod),
        csv(STATUS_ES[o.status] ?? o.status),
        o.checkedIn ? 'SI' : 'NO',
        csv(fmt(o.checkedInAt)),
        csv(fmt(o.createdAt)),
        csv(o.notes ?? ''),
      ].join(';'))
    }

    // BOM para que Excel en español respete los acentos.
    const body = '﻿' + L.join('\r\n')
    const slug = event.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'evento'
    const stamp = new Date().toISOString().slice(0, 10)

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="reporte-entradas-${slug}-${stamp}.csv"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[GET /api/admin/entradas/[eventId]/report]', err)
    return NextResponse.json({ error: 'No se pudo generar el reporte' }, { status: 500 })
  }
}
