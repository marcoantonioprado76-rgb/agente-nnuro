export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyBscTransaction } from '@/lib/blockchain'
import { sendTicketGroupEmail, sendTicketPendingEmail } from '@/lib/email'
import { sendTicketsWhatsapp, notifyOwnerNewOrder, sendPurchaseReceivedWhatsapp, normalizePhone } from '@/lib/entradasWhatsapp'
import { getUsdtToBob } from '@/lib/exchangeRate'
import { randomUUID } from 'crypto'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function generateTicketCode(): string {
  // 8-digit numeric code: 00000000 – 99999999 (100 million combinations)
  return Math.floor(Math.random() * 100_000_000).toString().padStart(8, '0')
}

async function uniqueCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = generateTicketCode()
    const exists = await prisma.ticketOrder.findUnique({ where: { ticketCode: code } })
    if (!exists) return code
  }
  throw new Error('CODE_EXHAUSTED')
}

/** POST /api/entradas/[eventId]/orders — public ticket purchase (no login required) */
export async function POST(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const body = await req.json()
    const { customerName, customerEmail, customerPhone, ticketTypeId, quantity, paymentMethod, proofUrl, txHash } = body

    // Validate required fields
    if (!customerName?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
    if (!customerEmail?.trim() || !EMAIL_RE.test(customerEmail.trim()))
      return NextResponse.json({ error: 'Email válido requerido' }, { status: 400 })
    if (!customerPhone?.trim()) return NextResponse.json({ error: 'Teléfono requerido' }, { status: 400 })
    if (!ticketTypeId) return NextResponse.json({ error: 'Tipo de entrada requerido' }, { status: 400 })

    const qty = parseInt(String(quantity ?? 1), 10)
    if (!Number.isInteger(qty) || qty < 1 || qty > 20)
      return NextResponse.json({ error: 'Cantidad inválida (1–20)' }, { status: 400 })

    // Load ticket type with event and discount info
    const ticketType = await prisma.ticketType.findUnique({
      where: { id: ticketTypeId, active: true },
      include: { event: true },
    })
    if (!ticketType) return NextResponse.json({ error: 'Tipo de entrada no disponible' }, { status: 404 })
    if (ticketType.eventId !== params.eventId) return NextResponse.json({ error: 'Entrada no pertenece a este evento' }, { status: 400 })
    if (!ticketType.event.active) return NextResponse.json({ error: 'Evento no disponible' }, { status: 404 })

    // INVITADO (gratis): no se paga nada. Solo se registra y se emite el QR.
    const isGuest = ticketType.isGuest === true

    const pm: 'CRYPTO' | 'MANUAL' | 'GUEST' = isGuest ? 'GUEST' : paymentMethod === 'CRYPTO' ? 'CRYPTO' : 'MANUAL'

    if (pm === 'CRYPTO' && !txHash?.trim()) return NextResponse.json({ error: 'Hash de transacción requerido' }, { status: 400 })
    if (pm === 'MANUAL' && !proofUrl?.trim()) return NextResponse.json({ error: 'Comprobante de pago requerido' }, { status: 400 })

    // Fast-path duplicate txHash check (DB unique constraint is the true guard)
    if (pm === 'CRYPTO') {
      const used = await prisma.ticketOrder.findFirst({ where: { txHash: txHash.trim() } })
      if (used) return NextResponse.json({ error: 'Esta transacción ya fue usada' }, { status: 409 })
    }

    // Calculate price — apply bulk discount if configured and quantity meets threshold
    // (el INVITADO siempre vale 0)
    const basePrice = isGuest ? 0 : Number(ticketType.price)
    const bulkMin = ticketType.bulkMinQty ?? 0
    const bulkPct = ticketType.bulkDiscountPct ? Number(ticketType.bulkDiscountPct) : 0
    const hasDiscount = !isGuest && bulkMin > 0 && bulkPct > 0 && qty >= bulkMin
    const unitPrice = hasDiscount ? parseFloat((basePrice * (1 - bulkPct / 100)).toFixed(2)) : basePrice
    const totalPrice = parseFloat((unitPrice * qty).toFixed(2))

    // INVITADO → aprobado al instante (no hay pago que verificar).
    let finalStatus: 'PENDING' | 'APPROVED' = isGuest ? 'APPROVED' : 'PENDING'
    let blockNumber: bigint | null = null

    if (pm === 'CRYPTO') {
      try {
        const verification = await verifyBscTransaction(txHash.trim(), totalPrice)
        if (verification.success) {
          finalStatus = 'APPROVED'
          blockNumber = verification.blockNumber ? BigInt(verification.blockNumber) : null
        }
      } catch (e) {
        console.error('[orders] blockchain verify error:', e)
        // Fail open: if blockchain is unreachable, treat as PENDING for admin review
        finalStatus = 'PENDING'
      }
    }

    // Generate one unique code per ticket — deduplicate within the batch too
    const codes: string[] = []
    const seen = new Set<string>()
    while (codes.length < qty) {
      const code = await uniqueCode()
      if (!seen.has(code)) {
        seen.add(code)
        codes.push(code)
      }
    }

    // All tickets from this purchase share a purchaseGroupId
    const purchaseGroupId = randomUUID()

    // TIPO DE CAMBIO CONGELADO: se toma la referencia de Binance AHORA (en el servidor,
    // no se confía en el cliente) y se guarda con la compra. Aunque después el cambio
    // suba o baje, el precio en Bs de ESTA compra siempre se lee con esta referencia.
    let bsRate: number | null = null
    let totalBsFrozen: number | null = null
    if (!isGuest) {
      try {
        const tc = await getUsdtToBob()
        bsRate = tc.rate
        totalBsFrozen = Math.round(unitPrice * tc.rate * 100) / 100 // por entrada
      } catch (e) {
        console.error('[orders] no se pudo fijar el TC de Binance:', e)
      }
    }

    // Create all orders atomically — re-check capacity inside transaction
    const orders = await prisma.$transaction(async (tx) => {
      if (ticketType.capacity != null) {
        const sold = await tx.ticketOrder.aggregate({
          _sum: { quantity: true },
          where: { ticketTypeId: ticketType.id, status: { in: ['PENDING', 'APPROVED'] } },
        })
        const soldQty = (sold._sum.quantity ?? 0) + qty
        if (soldQty > ticketType.capacity) throw new Error('CAPACITY_EXCEEDED')
      }

      return Promise.all(
        codes.map((code, idx) =>
          tx.ticketOrder.create({
            data: {
              eventId: params.eventId,
              ticketTypeId: ticketType.id,
              ticketTypeName: ticketType.name,
              customerName: customerName.trim(),
              customerEmail: customerEmail.trim().toLowerCase(),
              // Normalizado con código de país: sin el 591 el WhatsApp NUNCA llega.
              customerPhone: normalizePhone(customerPhone) ?? customerPhone.trim(),
              ticketCode: code,
              quantity: 1,
              unitPrice,
              totalPrice: unitPrice,
              paymentMethod: pm,
              proofUrl: pm === 'MANUAL' ? proofUrl.trim() : null,
              txHash: pm === 'CRYPTO' && idx === 0 ? txHash.trim() : null,
              blockNumber: pm === 'CRYPTO' && idx === 0 ? blockNumber : null,
              purchaseGroupId,
              bsRate,
              totalBs: totalBsFrozen,
              status: finalStatus as any,
            },
          })
        )
      )
    }).catch((err: any) => {
      if (err.message === 'CAPACITY_EXCEEDED') return null
      if (err.code === 'P2002') {
        const target: string = err.meta?.target ?? ''
        if (target.includes('tx_hash')) throw Object.assign(new Error('TX_DUPLICATE'), { statusCode: 409 })
        if (target.includes('ticket_code')) throw Object.assign(new Error('CODE_COLLISION'), { statusCode: 500 })
      }
      throw err
    })

    if (!orders) return NextResponse.json({ error: 'No hay suficientes entradas disponibles' }, { status: 409 })

    const eventForWa = { title: ticketType.event.title, date: ticketType.event.date, location: ticketType.event.location }

    // Send one combined email with all codes if APPROVED (crypto auto-verified)
    if (finalStatus === 'APPROVED') {
      sendTicketGroupEmail(
        orders[0].customerEmail,
        orders[0].customerName,
        eventForWa,
        orders.map(o => ({
          ticketCode: o.ticketCode,
          typeName: ticketType.name,
          typeImage: ticketType.image ?? ticketType.event.image,
        })),
        totalPrice
      ).catch(e => console.error('[email] group ticket:', e))

      // La entrada TAMBIÉN por WhatsApp (con QR) — es lo que la gente realmente abre.
      sendTicketsWhatsapp(
        orders[0].customerPhone,
        orders[0].customerName,
        eventForWa,
        orders.map(o => ({ ticketCode: o.ticketCode, ticketTypeName: ticketType.name })),
      )
        .then((ok) => {
          if (ok) {
            prisma.ticketOrder
              .updateMany({ where: { purchaseGroupId }, data: { waSentAt: new Date() } })
              .catch(e => console.error('[entradas] marcar waSentAt:', e))
          }
        })
        .catch(e => console.error('[entradas] WhatsApp entrada:', e))
    }

    // PENDIENTE (pago por transferencia): confirmamos al comprador que su compra
    // llegó y está en verificación. Antes no recibía NADA hasta que se aprobaba.
    if (finalStatus === 'PENDING') {
      sendTicketPendingEmail(orders[0].customerEmail, orders[0].customerName, eventForWa, qty, totalPrice)
        .catch(e => console.error('[email] compra pendiente:', e))
      // (El WhatsApp de "compra recibida" requiere otra plantilla aprobada; por ahora va solo el email.)
    }

    // Avisar al dueño por WhatsApp de la compra nueva (best-effort, no bloquea).
    notifyOwnerNewOrder({
      customerName: orders[0].customerName,
      customerPhone: orders[0].customerPhone,
      eventTitle: ticketType.event.title,
      ticketTypeName: ticketType.name,
      quantity: qty,
      totalPrice,
      paymentMethod: pm,
    }).catch(e => console.error('[entradas] aviso al dueño:', e))

    return NextResponse.json({
      orders: orders.map(o => ({
        id: o.id,
        ticketCode: o.ticketCode,
        status: finalStatus,
      })),
      totalPrice,
      bsRate,
      totalBs: bsRate != null ? Math.round(totalPrice * bsRate * 100) / 100 : null,
      hasDiscount,
      discountPct: hasDiscount ? bulkPct : 0,
    }, { status: 201 })
  } catch (err: any) {
    if (err.message === 'TX_DUPLICATE')
      return NextResponse.json({ error: 'Esta transacción ya fue usada' }, { status: 409 })
    if (err.message === 'CODE_COLLISION' || err.message === 'CODE_EXHAUSTED')
      return NextResponse.json({ error: 'Error generando código, intenta de nuevo' }, { status: 500 })
    console.error('[POST /api/entradas/[eventId]/orders]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
