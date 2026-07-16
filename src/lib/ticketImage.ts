/**
 * Entradas — Dibuja la ENTRADA como imagen PNG (con su diseño y el QR adentro).
 *
 * En vez de mandar un QR suelto y chiquito, se genera el TICKET COMPLETO:
 *   - El metal según el nivel: VIP → ORO · GENERAL → PLATA · INVITADO → ÓNIX.
 *   - Talón perforado con el nivel escrito en vertical (como una entrada real).
 *   - Datos del evento (título, fecha, lugar) y del asistente.
 *   - El QR GRANDE (no enano) sobre fondo blanco, listo para escanear en la puerta.
 *
 * Se dibuja con `canvas` (dependencia NATIVA que vive solo en el servidor; está
 * marcada como externa en next.config.js). A 1200×630 px se ve nítido en el correo
 * y al descargarlo. NUNCA lanza hacia afuera: si algo falla, devuelve null.
 */

import QRCode from 'qrcode'

// `canvas` es nativo y solo existe en el servidor: se carga en tiempo de ejecución.
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-explicit-any
const { createCanvas, loadImage } = require('canvas') as any

export type TicketTier = 'VIP' | 'GENERAL' | 'GUEST'

export type TicketImageData = {
  tierName: string       // nombre real del tipo ("VIP", "General", "Invitado")
  isGuest: boolean
  code: string
  attendee: string
  eventTitle: string
  eventDate: string      // ya formateada ("jue 30 jul · 11:00")
  eventLocation: string
}

/** Elige el nivel a partir del nombre del tipo (igual que en la página de compra). */
export function tierFor(typeName: string, isGuest: boolean): TicketTier {
  if (isGuest) return 'GUEST'
  if (/vip|premium|platin|diamond|gold/i.test(typeName)) return 'VIP'
  return 'GENERAL'
}

/** Paleta metálica de cada nivel. */
const TIERS: Record<TicketTier, {
  label: string
  metal: Array<[number, string]> // paradas del degradado del cuerpo
  stub: Array<[number, string]>  // paradas del degradado del talón
  ink: string
  inkSoft: string
  edge: string
  stubInk: string
}> = {
  VIP: {
    label: 'VIP',
    metal: [[0, '#8A6410'], [0.18, '#D4A32B'], [0.34, '#F7DE7E'], [0.46, '#FFF6C8'], [0.58, '#EFC751'], [0.74, '#C9971F'], [1, '#8A6410']],
    stub: [[0, '#151310'], [0.5, '#2A241A'], [1, '#151310']],
    ink: '#2A1F05', inkSoft: 'rgba(42,31,5,0.72)', edge: '#F0D27A', stubInk: '#F7DE7E',
  },
  GENERAL: {
    label: 'GENERAL',
    metal: [[0, '#7C8288'], [0.18, '#C3C8CE'], [0.34, '#EDF0F3'], [0.46, '#FFFFFF'], [0.58, '#D3D8DE'], [0.74, '#A2A8AF'], [1, '#767C83']],
    stub: [[0, '#22262B'], [0.5, '#3C4249'], [1, '#22262B']],
    ink: '#1B2026', inkSoft: 'rgba(27,32,38,0.68)', edge: '#E3E7EB', stubInk: '#E3E7EB',
  },
  GUEST: {
    label: 'INVITADO',
    metal: [[0, '#1C1C1E'], [0.22, '#3A3A3C'], [0.42, '#2C2C2E'], [0.58, '#4A4A4D'], [0.78, '#232325'], [1, '#1a262f']],
    stub: [[0, '#0E0E10'], [0.5, '#242426'], [1, '#0E0E10']],
    ink: '#F5D77A', inkSoft: 'rgba(245,215,122,0.72)', edge: '#8A6D2F', stubInk: '#F5D77A',
  },
}

/** Rectángulo con esquinas redondeadas. */
function roundRect(ctx: any, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** Recorta un texto para que no se pase del ancho dado (agrega "…"). */
function fit(ctx: any, text: string, maxWidth: number): string {
  let t = text
  if (ctx.measureText(t).width <= maxWidth) return t
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1)
  return `${t}…`
}

const W = 1200
const H = 630
const STUB_W = 150

/**
 * Dibuja la entrada completa y devuelve el PNG. `null` si algo falla.
 */
export async function renderTicketPng(data: TicketImageData): Promise<Buffer | null> {
  try {
    const tier = TIERS[tierFor(data.tierName, data.isGuest)]
    const canvas = createCanvas(W, H)
    const ctx = canvas.getContext('2d')

    // Fondo (por si el PNG se ve sobre algo transparente).
    ctx.fillStyle = '#1a262f'
    ctx.fillRect(0, 0, W, H)

    // ── Cuerpo metálico ──────────────────────────────────────────────────────
    const body = ctx.createLinearGradient(STUB_W, 0, W, H)
    for (const [stop, color] of tier.metal) body.addColorStop(stop, color)
    ctx.fillStyle = body
    roundRect(ctx, 0, 0, W, H, 28)
    ctx.fill()

    // Brillo diagonal (efecto metal).
    const shine = ctx.createLinearGradient(W * 0.25, 0, W * 0.65, H)
    shine.addColorStop(0, 'rgba(255,255,255,0)')
    shine.addColorStop(0.45, 'rgba(255,255,255,0.28)')
    shine.addColorStop(0.6, 'rgba(255,255,255,0)')
    ctx.fillStyle = shine
    roundRect(ctx, 0, 0, W, H, 28)
    ctx.fill()

    // ── Talón (stub) ─────────────────────────────────────────────────────────
    ctx.save()
    roundRect(ctx, 0, 0, W, H, 28)
    ctx.clip()
    const stub = ctx.createLinearGradient(0, 0, STUB_W, H)
    for (const [stop, color] of tier.stub) stub.addColorStop(stop, color)
    ctx.fillStyle = stub
    ctx.fillRect(0, 0, STUB_W, H)
    ctx.restore()

    // Perforación entre talón y cuerpo.
    ctx.strokeStyle = tier.edge
    ctx.lineWidth = 3
    ctx.setLineDash([14, 12])
    ctx.beginPath()
    ctx.moveTo(STUB_W, 24)
    ctx.lineTo(STUB_W, H - 24)
    ctx.stroke()
    ctx.setLineDash([])

    // Nivel en VERTICAL dentro del talón.
    ctx.save()
    ctx.translate(STUB_W / 2, H / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillStyle = tier.stubInk
    ctx.font = 'bold 46px "DejaVu Sans", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const spaced = tier.label.split('').join(' ')
    ctx.fillText(spaced, 0, 0)
    ctx.restore()

    // ── QR grande, a la derecha ──────────────────────────────────────────────
    const QR = 300
    const qrX = W - QR - 60
    const qrY = (H - QR) / 2

    // Marco blanco (para que el QR contraste sobre el metal y sea escaneable).
    ctx.fillStyle = '#FFFFFF'
    roundRect(ctx, qrX - 16, qrY - 16, QR + 32, QR + 32, 18)
    ctx.fill()

    const qrDataUrl = await QRCode.toDataURL(data.code, {
      width: QR, margin: 1, errorCorrectionLevel: 'M',
      color: { dark: '#12303a', light: '#FFFFFF' },
    })
    const qrImg = await loadImage(qrDataUrl)
    ctx.drawImage(qrImg, qrX, qrY, QR, QR)

    // Código debajo del QR.
    ctx.fillStyle = tier.ink
    ctx.font = 'bold 30px "DejaVu Sans Mono", monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(data.code, qrX + QR / 2, qrY + QR + 26)

    // ── Contenido (centro) ───────────────────────────────────────────────────
    const cx = STUB_W + 52
    const contentW = qrX - 40 - cx

    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'

    // Estrellas
    ctx.fillStyle = tier.inkSoft
    ctx.font = 'bold 20px "DejaVu Sans", sans-serif'
    ctx.fillText('★ ★ ★ ★ ★ ★ ★ ★', cx, 82)

    // Nombre del tipo (VIP / General / Invitado)
    ctx.fillStyle = tier.ink
    ctx.font = 'bold 62px "DejaVu Sans", sans-serif'
    ctx.fillText(fit(ctx, data.tierName.toUpperCase(), contentW), cx, 150)

    // ADMIT ONE / entrada
    ctx.fillStyle = tier.inkSoft
    ctx.font = 'bold 22px "DejaVu Sans", sans-serif'
    ctx.fillText(data.isGuest ? 'ENTRADA DE INVITADO' : 'ENTRADA — ADMITE UNA PERSONA', cx, 186)

    // Línea separadora
    ctx.strokeStyle = tier.inkSoft
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(cx, 214)
    ctx.lineTo(cx + contentW, 214)
    ctx.stroke()

    // Evento
    ctx.fillStyle = tier.inkSoft
    ctx.font = 'bold 18px "DejaVu Sans", sans-serif'
    ctx.fillText('EVENTO', cx, 252)
    ctx.fillStyle = tier.ink
    ctx.font = 'bold 40px "DejaVu Sans", sans-serif'
    ctx.fillText(fit(ctx, data.eventTitle, contentW), cx, 296)

    // Fecha
    ctx.fillStyle = tier.inkSoft
    ctx.font = 'bold 18px "DejaVu Sans", sans-serif'
    ctx.fillText('FECHA', cx, 344)
    ctx.fillStyle = tier.ink
    ctx.font = 'bold 30px "DejaVu Sans", sans-serif'
    ctx.fillText(fit(ctx, data.eventDate, contentW), cx, 380)

    // Lugar
    ctx.fillStyle = tier.inkSoft
    ctx.font = 'bold 18px "DejaVu Sans", sans-serif'
    ctx.fillText('LUGAR', cx, 424)
    ctx.fillStyle = tier.ink
    ctx.font = 'bold 30px "DejaVu Sans", sans-serif'
    ctx.fillText(fit(ctx, data.eventLocation, contentW), cx, 460)

    // Asistente
    ctx.fillStyle = tier.inkSoft
    ctx.font = 'bold 18px "DejaVu Sans", sans-serif'
    ctx.fillText('A NOMBRE DE', cx, 506)
    ctx.fillStyle = tier.ink
    ctx.font = 'bold 30px "DejaVu Sans", sans-serif'
    ctx.fillText(fit(ctx, data.attendee, contentW), cx, 542)

    // Marca abajo
    ctx.fillStyle = tier.inkSoft
    ctx.font = 'bold 20px "DejaVu Sans", sans-serif'
    ctx.fillText('MY DIAMOND', cx, 590)

    // Borde metálico
    ctx.strokeStyle = tier.edge
    ctx.lineWidth = 4
    roundRect(ctx, 2, 2, W - 4, H - 4, 28)
    ctx.stroke()

    return canvas.toBuffer('image/png')
  } catch (err) {
    console.error('[TICKET IMG] error dibujando la entrada:', err)
    return null
  }
}
