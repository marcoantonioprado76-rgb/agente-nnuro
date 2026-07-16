/**
 * Entradas — Envíos por WhatsApp. **SOLO por el canal OFICIAL (YCloud).**
 *
 * ⚠️ NUNCA usar la sesión no oficial (Baileys) para esto: mandarle mensajes a
 * compradores que nunca nos escribieron es exactamente lo que hace que WhatsApp
 * BANEE el número. Por eso todo va por la API oficial (YCloud):
 *
 *   - Entrada con QR al comprador → PLANTILLA APROBADA con imagen en el encabezado.
 *     Es la única forma oficial de mandarle una imagen a alguien fuera de la
 *     ventana de 24h. Sin plantilla aprobada NO se envía nada (y se avisa en el log).
 *   - Aviso al DUEÑO → mensaje de sesión normal (él sí nos escribe seguido).
 *
 * Si no se puede enviar, el EMAIL sigue funcionando como respaldo. NUNCA lanza.
 */

import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/crypto'
import { sendText, sendTemplateWithImage } from '@/lib/ycloud'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://agentenuro.com'

/**
 * INTERRUPTOR: enviar la entrada al WhatsApp del COMPRADOR.
 *
 * APAGADO por defecto. Meta está rechazando la plantilla, así que cada intento
 * fallaba y solo generaba ruido. La entrada se entrega por EMAIL (con su diseño,
 * el QR y el botón de descarga), que funciona perfecto.
 *
 * Cuando Meta apruebe la plantilla, se prende con `ENTRADAS_WHATSAPP=on` en el
 * .env del servidor y reinicio — sin tocar una línea de código.
 *
 * (El aviso al DUEÑO NO depende de esto: ese sí funciona y sigue activo.)
 */
const TICKETS_WA_ENABLED = process.env.ENTRADAS_WHATSAPP === 'on'

/** Plantilla aprobada (header IMAGE) para entregar la entrada con su QR. */
const TICKET_TEMPLATE = process.env.ENTRADAS_QR_TEMPLATE || 'entrada_qr'
const TICKET_TEMPLATE_LANG = process.env.ENTRADAS_QR_TEMPLATE_LANG || 'es'

/** ¿Está habilitado el envío de entradas por WhatsApp? (lo consulta el worker). */
export function ticketsWhatsappEnabled(): boolean {
  return TICKETS_WA_ENABLED
}

/**
 * URL pública del QR de una entrada. Termina en ".png" a propósito: WhatsApp EXIGE
 * que la imagen del encabezado de una plantilla tenga extensión .png/.jpg.
 */
export function ticketQrUrl(ticketCode: string): string {
  return `${APP_URL}/api/entradas/qr/${encodeURIComponent(ticketCode)}.png`
}

/**
 * Normaliza un teléfono a formato internacional (dígitos con código de país).
 *
 * CLAVE: la gente escribe su número LOCAL boliviano ("67534487", 8 dígitos). Sin el
 * código de país (591) WhatsApp NO entrega el mensaje.
 */
export function normalizePhone(raw: string): string | null {
  let d = (raw ?? '').replace(/\D/g, '')
  if (!d) return null
  d = d.replace(/^0+/, '')
  // Bolivia: móvil local de 8 dígitos que empieza con 6 o 7 → le falta el 591.
  if (d.length === 8 && /^[67]/.test(d)) d = `591${d}`
  if (d.length < 10) return null
  return d
}

/** Credenciales del canal OFICIAL (YCloud) del agente. */
async function ycloudCreds(): Promise<{ from: string; apiKey: string } | null> {
  try {
    const agent = await prisma.assistantAgent.findFirst({
      where: { isActive: true, provider: 'YCLOUD' },
      select: { providerApiKeyEnc: true, providerSender: true },
    })
    const from = (agent?.providerSender ?? '').trim()
    if (!from || !agent?.providerApiKeyEnc) return null
    let apiKey = ''
    try { apiKey = decrypt(agent.providerApiKeyEnc).trim() } catch { apiKey = '' }
    if (!apiKey) return null
    return { from, apiKey }
  } catch (err) {
    console.error('[ENTRADAS WA] error leyendo credenciales YCloud:', err)
    return null
  }
}

/** Fecha del evento formateada para Bolivia. */
export function eventDateText(date: Date | null | undefined): string {
  if (!date) return 'Fecha por confirmar'
  try {
    return new Intl.DateTimeFormat('es-BO', {
      timeZone: 'America/La_Paz', weekday: 'long', day: '2-digit', month: 'long',
      hour: '2-digit', minute: '2-digit', hour12: true,
    }).format(new Date(date))
  } catch {
    return new Date(date).toLocaleString('es-BO')
  }
}

export type TicketForWa = { ticketCode: string; ticketTypeName: string }
export type EventForWa = { title: string; date: Date | null; location: string | null }

/**
 * Entrega la ENTRADA con su QR por el canal OFICIAL (plantilla con imagen).
 * Una plantilla por entrada (cada QR es distinto). Devuelve `true` solo si SALIERON
 * TODAS (si falta alguna, el worker de reintento la manda después).
 */
export async function sendTicketsWhatsapp(
  phone: string,
  customerName: string,
  event: EventForWa,
  tickets: TicketForWa[],
): Promise<boolean> {
  try {
    // APAGADO: la entrada va SOLO por email. No se intenta nada por WhatsApp.
    if (!TICKETS_WA_ENABLED) return false

    if (tickets.length === 0) return false

    const to = normalizePhone(phone)
    if (!to) {
      console.warn(`[ENTRADAS WA] teléfono inválido (${phone}) — no se envía`)
      return false
    }

    const creds = await ycloudCreds()
    if (!creds) {
      console.warn('[ENTRADAS WA] sin credenciales de YCloud — la entrada va solo por email')
      return false
    }

    const nombre = (customerName || '').split(' ')[0] || 'Hola'
    const cuando = eventDateText(event.date)
    const donde = event.location || 'Por confirmar'

    let sent = 0
    for (const t of tickets) {
      try {
        await sendTemplateWithImage(
          creds.from, to, creds.apiKey,
          TICKET_TEMPLATE, TICKET_TEMPLATE_LANG,
          ticketQrUrl(t.ticketCode), // el QR va en el ENCABEZADO de la plantilla
          [
            { text: nombre },
            { text: event.title },
            { text: cuando },
            { text: donde },
            { text: t.ticketCode },
          ],
        )
        sent++
      } catch (err) {
        console.error(`[ENTRADAS WA] plantilla "${TICKET_TEMPLATE}" falló para ${t.ticketCode}:`, (err as { message?: string })?.message)
      }
      await new Promise((r) => setTimeout(r, 900)) // ritmo entre envíos
    }

    const allSent = sent === tickets.length
    console.log(`[ENTRADAS WA] QR (oficial) enviados a ${to}: ${sent}/${tickets.length}${allSent ? ' ✅' : ' ⚠️ se reintentará'}`)
    return allSent
  } catch (err) {
    console.error('[ENTRADAS WA] sendTicketsWhatsapp error:', err)
    return false
  }
}

/**
 * Avisa al DUEÑO que entró una compra. Va por YCloud como mensaje de sesión: el
 * dueño le escribe seguido a CAMILA, así que su ventana de 24h suele estar abierta.
 * Si no lo está, WhatsApp simplemente no lo entrega (cero riesgo).
 */
export async function notifyOwnerNewOrder(params: {
  customerName: string
  customerPhone: string
  eventTitle: string
  ticketTypeName: string
  quantity: number
  totalPrice: number
  paymentMethod: string
}): Promise<void> {
  try {
    const owners = (process.env.DIAMOND_OWNER_PHONES ?? '')
      .split(',').map((s) => s.replace(/\D/g, '')).filter((s) => s.length >= 8)
    if (owners.length === 0) return

    const creds = await ycloudCreds()
    if (!creds) return

    const pago = params.paymentMethod === 'GUEST' ? 'Invitado (gratis)'
      : params.paymentMethod === 'CRYPTO' ? 'Cripto (verificado)'
      : 'Comprobante (revisar)'

    const text =
      `🎟️ *Nueva compra de entradas*\n\n` +
      `👤 ${params.customerName}\n` +
      `📱 ${params.customerPhone}\n` +
      `🎫 ${params.quantity}× ${params.ticketTypeName} — *${params.eventTitle}*\n` +
      `💵 $${params.totalPrice.toFixed(2)} USDT\n` +
      `💳 ${pago}\n\n` +
      `Revisala en el panel → Entradas.`

    for (const owner of owners) {
      try {
        await sendText(creds.from, owner, text, creds.apiKey)
      } catch (err) {
        console.error(`[ENTRADAS WA] aviso al dueño ${owner} falló:`, (err as { message?: string })?.message)
      }
    }
  } catch (err) {
    console.error('[ENTRADAS WA] notifyOwnerNewOrder error:', err)
  }
}

/**
 * "Compra recibida" al comprador. Requeriría OTRA plantilla aprobada (el comprador
 * nunca nos escribió). Por ahora NO se manda por WhatsApp — el EMAIL ya cumple esa
 * función. Se deja la firma para no romper a quien la llama.
 */
export async function sendPurchaseReceivedWhatsapp(): Promise<boolean> {
  return false
}

/**
 * Recordatorio del evento. También requeriría su propia plantilla aprobada
 * (categoría UTILITY). Hasta tenerla, no se envía nada por WhatsApp.
 */
export async function sendEventReminder(): Promise<boolean> {
  return false
}
