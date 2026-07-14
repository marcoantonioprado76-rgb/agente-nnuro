/**
 * Entradas — Recordatorios automáticos del evento por WhatsApp.
 *
 * `runEventReminders()` corre cada minuto (desde `instrumentation.ts`) y avisa a
 * quienes tienen entrada APROBADA:
 *   - 1 DÍA antes  (ventana 24h ± 30min desde ahora)
 *   - 2 HORAS antes (ventana 2h ± 15min desde ahora)
 *
 * Cada recordatorio se marca en la entrada (`reminder1dAt` / `reminder2hAt`) para
 * NO repetirlo en el siguiente tick. Se manda UNO por persona (no uno por entrada,
 * aunque haya comprado varias).
 *
 * ROBUSTEZ: todo va en try/catch; un fallo no corta el tick. NUNCA lanza.
 */

import { prisma } from '@/lib/prisma'
import { sendEventReminder, sendTicketsWhatsapp, ticketsWhatsappEnabled } from '@/lib/entradasWhatsapp'

const MIN = 60_000
const HOUR = 60 * MIN

/** Evita que dos ticks se solapen. */
let running = false

type Kind = '1d' | '2h'

/** Entradas aprobadas cuyo evento cae dentro de la ventana y que aún no fueron avisadas. */
async function pending(kind: Kind, now: Date) {
  const target = kind === '1d' ? 24 * HOUR : 2 * HOUR
  const slack = kind === '1d' ? 30 * MIN : 15 * MIN
  const from = new Date(now.getTime() + target - slack)
  const to = new Date(now.getTime() + target + slack)

  return prisma.ticketOrder.findMany({
    where: {
      status: 'APPROVED',
      ...(kind === '1d' ? { reminder1dAt: null } : { reminder2hAt: null }),
      event: { active: true, date: { gte: from, lte: to } },
    },
    select: {
      id: true, customerName: true, customerPhone: true,
      event: { select: { title: true, date: true, location: true } },
    },
    take: 200,
  })
}

/** Manda los recordatorios de un tipo (1d / 2h). Devuelve cuántas personas se avisaron. */
async function runKind(kind: Kind, now: Date): Promise<number> {
  // Los recordatorios también requieren plantilla aprobada → si WhatsApp está
  // apagado, no se hace nada (y no se marcan, para poder enviarlos cuando se prenda).
  if (!ticketsWhatsappEnabled()) return 0

  const rows = await pending(kind, now)
  if (rows.length === 0) return 0

  // Una sola persona puede tener varias entradas → un aviso por teléfono.
  const byPhone = new Map<string, { name: string; event: { title: string; date: Date | null; location: string | null }; ids: string[] }>()
  for (const r of rows) {
    const phone = (r.customerPhone ?? '').replace(/\D/g, '')
    if (!phone) continue
    const entry = byPhone.get(phone)
    if (entry) entry.ids.push(r.id)
    else byPhone.set(phone, { name: r.customerName, event: r.event, ids: [r.id] })
  }

  let sent = 0
  for (const [phone, info] of Array.from(byPhone.entries())) {
    try {
      const ok = await sendEventReminder() // requiere plantilla aprobada; hoy devuelve false
      // Marcamos igual si no se pudo enviar: así no lo reintentamos en bucle cada
      // minuto (el recordatorio es sensible al tiempo; si falló, ya pasó su momento).
      await prisma.ticketOrder.updateMany({
        where: { id: { in: info.ids } },
        data: kind === '1d' ? { reminder1dAt: now } : { reminder2hAt: now },
      })
      if (ok) sent++
      await new Promise((r) => setTimeout(r, 1500)) // ritmo anti-baneo entre personas
    } catch (err) {
      console.error(`[ENTRADAS REMIND] error avisando a ${phone}:`, err)
    }
  }

  if (sent > 0) console.log(`[ENTRADAS REMIND] recordatorio ${kind}: ${sent}/${byPhone.size} personas`)
  return sent
}

/**
 * REINTENTO de entrega de entradas — "esto no puede fallar".
 *
 * Si al aprobar una compra la sesión de WhatsApp estaba caída (p. ej. justo después
 * de un reinicio), la entrada NO se enviaba y se perdía para siempre. Ahora cada
 * minuto buscamos las entradas APROBADAS que todavía NO se enviaron (`waSentAt` en
 * null) y las reintentamos. Cuando la sesión vuelve, salen solas.
 *
 * Solo se reintentan las de los últimos 7 días (más viejo que eso no tiene sentido).
 */
async function retryTicketDeliveries(): Promise<number> {
  // Si el envío de entradas por WhatsApp está APAGADO, no hay nada que reintentar
  // (la entrada va por email). Evita golpear a YCloud cada minuto en vano.
  if (!ticketsWhatsappEnabled()) return 0

  const since = new Date(Date.now() - 7 * 24 * HOUR)

  const pendingSend = await prisma.ticketOrder.findMany({
    where: { status: 'APPROVED', waSentAt: null, createdAt: { gte: since } },
    select: {
      id: true, ticketCode: true, ticketTypeName: true,
      customerName: true, customerPhone: true, purchaseGroupId: true,
      event: { select: { title: true, date: true, location: true } },
    },
    orderBy: { createdAt: 'asc' },
    take: 60,
  })
  if (pendingSend.length === 0) return 0

  // Agrupamos por COMPRA (purchaseGroupId): un solo mensaje con todas sus entradas.
  const groups = new Map<string, typeof pendingSend>()
  for (const t of pendingSend) {
    const key = t.purchaseGroupId ?? t.id
    const arr = groups.get(key)
    if (arr) arr.push(t)
    else groups.set(key, [t])
  }

  let ok = 0
  for (const [, items] of Array.from(groups.entries())) {
    const first = items[0]
    try {
      const sent = await sendTicketsWhatsapp(
        first.customerPhone,
        first.customerName,
        first.event,
        items.map((t) => ({ ticketCode: t.ticketCode, ticketTypeName: t.ticketTypeName })),
      )
      if (sent) {
        // Solo marcamos si SALIÓ. Si no, queda pendiente y se reintenta al próximo tick.
        await prisma.ticketOrder.updateMany({
          where: { id: { in: items.map((t) => t.id) } },
          data: { waSentAt: new Date() },
        })
        ok++
        console.log(`[ENTRADAS RETRY] entrada(s) enviadas a ${first.customerPhone} (${items.length})`)
      }
    } catch (err) {
      console.error('[ENTRADAS RETRY] error reintentando entrega:', err)
    }
    await new Promise((r) => setTimeout(r, 1200)) // ritmo entre compras
  }
  return ok
}

/** Tick del worker: reintenta entregas pendientes + manda los recordatorios. */
export async function runEventReminders(): Promise<number> {
  if (running) return 0
  running = true
  try {
    const now = new Date()
    // Primero lo crítico: que TODA entrada aprobada llegue con su QR.
    const retried = await retryTicketDeliveries()
    const a = await runKind('1d', now)
    const b = await runKind('2h', now)
    return retried + a + b
  } catch (err) {
    console.error('[ENTRADAS REMIND] tick error:', err)
    return 0
  } finally {
    running = false
  }
}
