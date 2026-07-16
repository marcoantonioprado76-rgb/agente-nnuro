import nodemailer from 'nodemailer'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://mydiamondapp.com'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

function emailWrapper(content: string, accentColor = '#00E5D0'): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MY DIAMOND</title>
</head>
<body style="margin:0;padding:0;background-color:#EEF2F7;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#EEF2F7;padding:38px 16px;">
  <tr>
    <td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">

        <!-- TARJETA: cabecera NAVY (la del panel) + cuerpo BLANCO -->
        <tr>
          <td style="background:#FFFFFF;border:1px solid #E4E9F0;border-radius:18px;overflow:hidden;">

            <!-- Cabecera navy con el LOGO -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="background:linear-gradient(160deg,#1a262f 0%,#212e38 55%,#1a262f 100%);padding:28px 24px 24px;">
                  <img src="${APP_URL}/logo-oficial-mydiamond.png" alt="MY DIAMOND" width="140"
                       style="display:block;width:140px;max-width:55%;height:auto;border:0;outline:none;margin:0 auto;" />
                </td>
              </tr>
            </table>

            <!-- Línea con el degradado de la marca -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="height:5px;background:linear-gradient(90deg,${accentColor} 0%,#147e95 50%,#233B8F 100%);"></td>
              </tr>
            </table>

            <!-- Contenido (fondo blanco) -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:34px 30px;background:#FFFFFF;">
                  ${content}
                </td>
              </tr>
            </table>

            <!-- Pie de la tarjeta -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:14px 30px;border-top:1px solid #F0F3F7;background:#FAFBFD;">
                  <p style="color:#9CA3AF;font-size:11px;margin:0;letter-spacing:0.5px;">mydiamondapp.com &nbsp;·&nbsp; soporte@mydiamondapp.com</p>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- Pie general -->
        <tr>
          <td align="center" style="padding-top:20px;">
            <p style="color:#9CA3AF;font-size:11px;margin:0;letter-spacing:0.5px;">
              © 2026 MY DIAMOND. Todos los derechos reservados.
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>
  `.trim()
}

export async function sendWelcomeEmail(
  email: string,
  fullName: string,
): Promise<boolean> {
  const content = `
    <!-- label -->
    <p style="color:#00E5D0;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin:0 0 16px;">Cuenta creada exitosamente</p>

    <!-- heading -->
    <h1 style="color:#111827;font-size:22px;font-weight:800;margin:0 0 10px;letter-spacing:-0.3px;line-height:1.3;">
      Bienvenido, ${fullName}
    </h1>
    <p style="color:#6B7280;font-size:13px;margin:0 0 32px;line-height:1.8;">
      Ya formas parte de la plataforma <span style="color:#374151;font-weight:600;">MY DIAMOND</span>.
      Empieza a explorar todas las herramientas disponibles en tu panel.
    </p>

    <!-- divider -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr><td style="height:1px;background:#F7F9FC;"></td></tr>
    </table>

    <!-- CTA -->
    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="border-radius:10px;background:linear-gradient(135deg,#1fb8bb 0%,#147e95 48%,#233B8F 100%);">
          <a href="${APP_URL}/dashboard"
             style="display:inline-block;color:#ffffff;text-decoration:none;font-weight:700;font-size:13px;padding:12px 30px;border-radius:10px;letter-spacing:0.5px;">
            Ir a mi panel &rarr;
          </a>
        </td>
      </tr>
    </table>
  `

  try {
    await transporter.sendMail({
      from: `"MY DIAMOND" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: `Bienvenido a MY DIAMOND, ${fullName}`,
      html: emailWrapper(content, '#00E5D0'),
    })
    console.log(`[EMAIL] Welcome sent to ${email}`)
    return true
  } catch (err) {
    console.error('[EMAIL] Welcome error:', err)
    return false
  }
}

/**
 * Correo de bienvenida del Reto 90D (al correo que el participante registró).
 * Incluye un botón a WhatsApp (wa.me) para que el participante ESCRIBA PRIMERO al
 * número del reto — así el bot no inicia la conversación y se evita el baneo.
 * `bodyText` es el mensaje ya personalizado ({nombre}/{reto} reemplazados).
 */
export async function sendRetoWelcomeEmail(
  email: string,
  fullName: string,
  retoName: string,
  bodyText: string,
  waNumber?: string | null,
): Promise<boolean> {
  const esc = (s: string) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const body = esc(bodyText)
    .replace(/\*([^*\n]+)\*/g, '<strong style="color:#111827;">$1</strong>')
    .replace(/\n/g, '<br>')

  const waDigits = (waNumber || '').replace(/\D/g, '')
  const waText = encodeURIComponent(`Hola, soy ${fullName}. Me registré al ${retoName} y estoy listo para empezar 💪`)
  const waLink = waDigits ? `https://wa.me/${waDigits}?text=${waText}` : ''

  const ctaBlock = waLink
    ? `
    <table cellpadding="0" cellspacing="0" style="margin-top:8px;">
      <tr>
        <td style="border-radius:12px;background:linear-gradient(135deg,#25D366 0%,#128C7E 100%);">
          <a href="${waLink}" target="_blank"
             style="display:inline-block;color:#ffffff;text-decoration:none;font-weight:800;font-size:14px;padding:14px 30px;border-radius:12px;letter-spacing:0.4px;">
            📲 Escríbenos por WhatsApp para empezar
          </a>
        </td>
      </tr>
    </table>
    <p style="color:#9CA3AF;font-size:11px;margin:12px 0 0;line-height:1.6;">
      Toca el botón y envía el mensaje: así activas tu cupo y el asistente te guía cada día.
    </p>`
    : `
    <p style="color:#9CA3AF;font-size:12px;margin:8px 0 0;">Pronto te contactaremos por WhatsApp para empezar.</p>`

  const content = `
    <p style="color:#147e95;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin:0 0 16px;">Reto 90 Días</p>
    <h1 style="color:#111827;font-size:22px;font-weight:800;margin:0 0 14px;letter-spacing:-0.3px;line-height:1.3;">
      ¡Felicidades, ${esc(fullName)}! 🎉
    </h1>
    <p style="color:#6B7280;font-size:14px;margin:0 0 26px;line-height:1.9;">
      ${body}
    </p>
    ${ctaBlock}
  `

  try {
    await transporter.sendMail({
      from: `"MY DIAMOND" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: `¡Bienvenido al ${retoName}! 🎉`,
      html: emailWrapper(content, '#147e95'),
    })
    console.log(`[EMAIL] Reto welcome sent to ${email}`)
    return true
  } catch (err) {
    console.error('[EMAIL] Reto welcome error:', err)
    return false
  }
}

export interface OrderEmailItem {
  title: string
  quantity: number
  priceSnapshot: number
  selectedVariants: Record<string, string>
}

export async function sendOrderConfirmedEmail(
  email: string,
  fullName: string,
  order: {
    id: string
    totalPrice: number
    recipientName: string
    address: string
    city: string
    state: string
    country: string
    zipCode?: string | null
    createdAt: Date
    txHash?: string | null
    items: OrderEmailItem[]
  }
): Promise<boolean> {
  const orderId = order.id.slice(0, 8).toUpperCase()
  const dateStr = new Date(order.createdAt).toLocaleString('es-BO', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/La_Paz',
  })

  const itemsRows = order.items.map(oi => {
    const variantsText = Object.entries(oi.selectedVariants).map(([k, v]) => `${k}: ${v}`).join(', ')
    const subtotal = (oi.priceSnapshot * oi.quantity).toFixed(2)
    return `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #E4E9F0;color:#374151;font-size:13px;">
          ${oi.title}${variantsText ? `<br><span style="color:#9CA3AF;font-size:11px;">${variantsText}</span>` : ''}
        </td>
        <td style="padding:10px 8px;border-bottom:1px solid #E4E9F0;color:#6B7280;font-size:12px;text-align:center;">x${oi.quantity}</td>
        <td style="padding:10px 0;border-bottom:1px solid #E4E9F0;color:#F5A623;font-size:13px;font-weight:700;text-align:right;">${subtotal} USDT</td>
      </tr>
    `
  }).join('')

  const content = `
    <!-- label -->
    <p style="color:#00FF88;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin:0 0 16px;">✓ Pedido Confirmado</p>

    <!-- heading -->
    <h1 style="color:#111827;font-size:22px;font-weight:800;margin:0 0 6px;letter-spacing:-0.3px;line-height:1.3;">
      ¡Tu pedido fue aprobado!
    </h1>
    <p style="color:#6B7280;font-size:13px;margin:0 0 28px;line-height:1.7;">
      Hola <strong style="color:#374151;">${fullName}</strong>, tu compra en la Tienda MY DIAMOND ha sido confirmada.
    </p>

    <!-- order meta -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td style="background:rgba(0,255,136,0.04);border:1px solid rgba(0,255,136,0.12);border-radius:12px;padding:16px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <p style="color:#9CA3AF;font-size:9px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;margin:0 0 4px;">Número de pedido</p>
                <p style="color:#00FF88;font-size:20px;font-weight:900;letter-spacing:5px;margin:0;font-family:'Courier New',Courier,monospace;">#${orderId}</p>
              </td>
              <td style="text-align:right;vertical-align:top;">
                <p style="color:#9CA3AF;font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 4px;">Fecha</p>
                <p style="color:#6B7280;font-size:12px;margin:0;">${dateStr}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- items table -->
    <p style="color:#9CA3AF;font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 10px;">Productos</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      ${itemsRows}
      <!-- total row -->
      <tr>
        <td colspan="2" style="padding:12px 0 0;color:#9CA3AF;font-size:12px;font-weight:600;">Total</td>
        <td style="padding:12px 0 0;text-align:right;font-weight:900;font-size:16px;color:#F5A623;">${order.totalPrice.toFixed(2)} USDT</td>
      </tr>
    </table>

    <!-- divider -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr><td style="height:1px;background:#F7F9FC;"></td></tr>
    </table>

    <!-- delivery info -->
    <p style="color:#9CA3AF;font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 10px;">Datos de entrega</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="background:#F7F9FC;border:1px solid #E4E9F0;border-radius:10px;padding:14px 18px;">
          <p style="color:#374151;font-size:13px;font-weight:700;margin:0 0 4px;">${order.recipientName}</p>
          <p style="color:#9CA3AF;font-size:12px;margin:0;line-height:1.6;">
            ${order.address}<br>
            ${order.city}, ${order.state}, ${order.country}${order.zipCode ? ` — CP ${order.zipCode}` : ''}
          </p>
        </td>
      </tr>
    </table>

    ${order.txHash ? `
    <!-- tx hash -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="background:rgba(0,229,208,0.03);border:1px solid rgba(0,229,208,0.1);border-radius:10px;padding:12px 16px;">
          <p style="color:#9CA3AF;font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 4px;">TX Hash (BSC)</p>
          <p style="color:rgba(0,229,208,0.6);font-size:10px;margin:0;word-break:break-all;font-family:'Courier New',Courier,monospace;">${order.txHash}</p>
        </td>
      </tr>
    </table>` : ''}

    <!-- CTA -->
    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="border-radius:10px;background:linear-gradient(135deg,#1fb8bb 0%,#147e95 48%,#233B8F 100%);">
          <a href="${APP_URL}/dashboard/store/my-orders"
             style="display:inline-block;color:#ffffff;text-decoration:none;font-weight:700;font-size:13px;padding:12px 28px;border-radius:10px;letter-spacing:0.5px;">
            Ver mis pedidos &rarr;
          </a>
        </td>
      </tr>
    </table>
  `

  try {
    await transporter.sendMail({
      from: `"MY DIAMOND" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: `✓ Pedido #${orderId} confirmado — MY DIAMOND`,
      html: emailWrapper(content, '#00FF88'),
    })
    console.log(`[EMAIL] Order confirmed sent to ${email} (order ${orderId})`)
    return true
  } catch (err) {
    console.error('[EMAIL] Order confirmed error:', err)
    return false
  }
}

export async function sendPlanPurchaseConfirmedEmail(
  email: string,
  fullName: string,
  purchase: {
    id: string
    plan: string
    price: number
    paymentMethod: string
    txHash?: string | null
    createdAt: Date
  }
): Promise<boolean> {
  const purchaseId = purchase.id.slice(0, 8).toUpperCase()
  const planLabel: Record<string, string> = { BASIC: 'Pack Básico', PRO: 'Pack Pro', ELITE: 'Pack Elite' }
  const planName = planLabel[purchase.plan] ?? purchase.plan
  const dateStr = new Date(purchase.createdAt).toLocaleString('es-BO', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/La_Paz',
  })

  const content = `
    <!-- label -->
    <p style="color:#00E5D0;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin:0 0 16px;">✓ Plan Activado</p>

    <!-- heading -->
    <h1 style="color:#111827;font-size:22px;font-weight:800;margin:0 0 6px;letter-spacing:-0.3px;line-height:1.3;">
      ¡Tu plan fue activado!
    </h1>
    <p style="color:#6B7280;font-size:13px;margin:0 0 28px;line-height:1.7;">
      Hola <strong style="color:#374151;">${fullName}</strong>, tu compra de plan en MY DIAMOND ha sido confirmada y tu cuenta ha sido activada.
    </p>

    <!-- plan card -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td style="background:linear-gradient(135deg,rgba(0,229,208,0.07),rgba(0,255,136,0.04));border:1px solid rgba(0,229,208,0.2);border-radius:14px;padding:20px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <p style="color:#9CA3AF;font-size:9px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;margin:0 0 6px;">Plan adquirido</p>
                <p style="color:#00E5D0;font-size:24px;font-weight:900;letter-spacing:2px;margin:0;">${planName.toUpperCase()}</p>
              </td>
              <td style="text-align:right;vertical-align:top;">
                <p style="color:#9CA3AF;font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 4px;">Total pagado</p>
                <p style="color:#F5A623;font-size:20px;font-weight:900;margin:0;">${purchase.price.toFixed(2)} <span style="font-size:12px;font-weight:600;color:rgba(245,166,35,0.7);">USDT</span></p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- meta info -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td style="background:#F7F9FC;border:1px solid #E4E9F0;border-radius:10px;padding:14px 18px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding-bottom:8px;">
                <p style="color:#9CA3AF;font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 3px;">Número de solicitud</p>
                <p style="color:#6B7280;font-size:12px;font-family:'Courier New',Courier,monospace;margin:0;">#${purchaseId}</p>
              </td>
            </tr>
            <tr>
              <td style="padding-bottom:8px;border-top:1px solid #E4E9F0;padding-top:8px;">
                <p style="color:#9CA3AF;font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 3px;">Fecha de activación</p>
                <p style="color:#6B7280;font-size:12px;margin:0;">${dateStr}</p>
              </td>
            </tr>
            <tr>
              <td style="border-top:1px solid #E4E9F0;padding-top:8px;">
                <p style="color:#9CA3AF;font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 3px;">Validez</p>
                <p style="color:#00FF88;font-size:12px;font-weight:700;margin:0;">30 días desde la activación</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${purchase.txHash ? `
    <!-- tx hash -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="background:rgba(0,229,208,0.03);border:1px solid rgba(0,229,208,0.1);border-radius:10px;padding:12px 16px;">
          <p style="color:#9CA3AF;font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 4px;">TX Hash (BSC)</p>
          <p style="color:rgba(0,229,208,0.6);font-size:10px;margin:0;word-break:break-all;font-family:'Courier New',Courier,monospace;">${purchase.txHash}</p>
        </td>
      </tr>
    </table>` : ''}

    <!-- CTA -->
    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="border-radius:10px;background:linear-gradient(135deg,#1fb8bb 0%,#147e95 48%,#233B8F 100%);">
          <a href="${APP_URL}/dashboard"
             style="display:inline-block;color:#ffffff;text-decoration:none;font-weight:700;font-size:13px;padding:12px 28px;border-radius:10px;letter-spacing:0.5px;">
            Ir a mi panel &rarr;
          </a>
        </td>
      </tr>
    </table>
  `

  try {
    await transporter.sendMail({
      from: `"MY DIAMOND" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: `✓ ${planName} activado — MY DIAMOND`,
      html: emailWrapper(content, '#00E5D0'),
    })
    console.log(`[EMAIL] Plan confirmed sent to ${email} (${purchase.plan})`)
    return true
  } catch (err) {
    console.error('[EMAIL] Plan confirmed error:', err)
    return false
  }
}

/**
 * Email del admin de notificación. Se puede sobrescribir vía env ADMIN_NOTIFICATION_EMAIL,
 * sino usa el default acordado.
 */
const ADMIN_NOTIFICATION_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || 'marcoantonioprado76@gmail.com'

// ─────────────────────────────────────────────────────────────────────────────
// Admin notifications — nuevas solicitudes pendientes
// ─────────────────────────────────────────────────────────────────────────────

const PLAN_LABEL_FOR_EMAIL: Record<string, string> = {
  BASIC: 'Pack Básico',
  PRO: 'Pack Pro',
  ELITE: 'Pack Elite',
}

const PAYMENT_LABEL_FOR_EMAIL: Record<string, string> = {
  MANUAL: '🏦 Transferencia / QR',
  CRYPTO: '🪙 Crypto / USDT',
  FASE_GLOBAL: '🌐 Fase Global',
}

/**
 * Aviso al admin cuando un usuario crea una solicitud de compra de PLAN
 * (BASIC, PRO o ELITE) por cualquier método de pago.
 */
export async function sendAdminNewPlanRequestEmail(payload: {
  requestId: string
  plan: string
  price: number
  paymentMethod: string
  paymentProofUrl?: string | null
  txHash?: string | null
  faseGlobalCode?: string | null
  faseGlobalNote?: string | null
  user: { fullName: string; email: string; username: string; country?: string | null; city?: string | null }
  createdAt: Date
}): Promise<boolean> {
  const shortId = payload.requestId.slice(0, 8).toUpperCase()
  const planLabel = PLAN_LABEL_FOR_EMAIL[payload.plan] ?? payload.plan
  const paymentLabel = PAYMENT_LABEL_FOR_EMAIL[payload.paymentMethod] ?? payload.paymentMethod
  const dateStr = new Date(payload.createdAt).toLocaleString('es-BO', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/La_Paz',
  })

  const proofBlock = payload.paymentProofUrl
    ? `
    <tr>
      <td style="padding:8px 0;color:#9CA3AF;font-size:11px;">Comprobante</td>
      <td style="padding:8px 0;text-align:right;">
        <a href="${payload.paymentProofUrl}" target="_blank" style="color:#60a5fa;text-decoration:none;font-size:12px;font-weight:600;">Ver imagen ↗</a>
      </td>
    </tr>`
    : ''

  const txBlock = payload.txHash
    ? `
    <tr>
      <td style="padding:8px 0;color:#9CA3AF;font-size:11px;">TX Hash</td>
      <td style="padding:8px 0;text-align:right;color:#6B7280;font-size:11px;font-family:'Courier New',monospace;word-break:break-all;">${payload.txHash}</td>
    </tr>`
    : ''

  const fgCodeBlock = payload.faseGlobalCode
    ? `
    <tr>
      <td style="padding:8px 0;color:#9CA3AF;font-size:11px;">Código Fase Global</td>
      <td style="padding:8px 0;text-align:right;color:#86efac;font-size:12px;font-weight:700;font-family:'Courier New',monospace;">${payload.faseGlobalCode}</td>
    </tr>`
    : ''

  const fgNoteBlock = payload.faseGlobalNote
    ? `
    <tr>
      <td colspan="2" style="padding:8px 0;color:#6B7280;font-size:11px;font-style:italic;line-height:1.6;">Nota: "${payload.faseGlobalNote}"</td>
    </tr>`
    : ''

  const content = `
    <p style="color:#fbbf24;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin:0 0 16px;">⚡ Nueva solicitud · Pendiente</p>

    <h1 style="color:#111827;font-size:22px;font-weight:800;margin:0 0 6px;letter-spacing:-0.3px;line-height:1.3;">
      ${payload.user.fullName} pidió ${planLabel}
    </h1>
    <p style="color:#6B7280;font-size:13px;margin:0 0 24px;line-height:1.7;">
      Hay una nueva solicitud de compra esperando tu aprobación en el panel.
    </p>

    <!-- request meta -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td style="background:rgba(251,191,36,0.06);border:1px solid rgba(251,191,36,0.18);border-radius:12px;padding:16px 20px;">
          <p style="color:#9CA3AF;font-size:9px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;margin:0 0 4px;">Solicitud</p>
          <p style="color:#fbbf24;font-size:20px;font-weight:900;letter-spacing:5px;margin:0 0 6px;font-family:'Courier New',monospace;">#${shortId}</p>
          <p style="color:#6B7280;font-size:11px;margin:0;">${dateStr}</p>
        </td>
      </tr>
    </table>

    <!-- details -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr><td colspan="2" style="padding:0 0 8px;border-bottom:1px solid #E4E9F0;"><p style="color:#9CA3AF;font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0;">Detalle del pago</p></td></tr>
      <tr>
        <td style="padding:10px 0;color:#9CA3AF;font-size:11px;width:140px;">Plan</td>
        <td style="padding:10px 0;text-align:right;color:#111827;font-size:13px;font-weight:700;">${planLabel}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#9CA3AF;font-size:11px;">Monto</td>
        <td style="padding:8px 0;text-align:right;color:#86efac;font-size:18px;font-weight:900;">$${payload.price.toFixed(2)} USD</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#9CA3AF;font-size:11px;">Método</td>
        <td style="padding:8px 0;text-align:right;color:#374151;font-size:12px;font-weight:600;">${paymentLabel}</td>
      </tr>
      ${proofBlock}
      ${txBlock}
      ${fgCodeBlock}
      ${fgNoteBlock}
    </table>

    <!-- user info -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr><td colspan="2" style="padding:0 0 8px;border-bottom:1px solid #E4E9F0;"><p style="color:#9CA3AF;font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0;">Usuario</p></td></tr>
      <tr>
        <td style="padding:10px 0;color:#9CA3AF;font-size:11px;width:140px;">Nombre</td>
        <td style="padding:10px 0;text-align:right;color:#111827;font-size:13px;font-weight:700;">${payload.user.fullName}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#9CA3AF;font-size:11px;">Usuario</td>
        <td style="padding:8px 0;text-align:right;color:#6B7280;font-size:12px;">@${payload.user.username}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#9CA3AF;font-size:11px;">Email</td>
        <td style="padding:8px 0;text-align:right;color:#6B7280;font-size:12px;">${payload.user.email}</td>
      </tr>
      ${payload.user.country || payload.user.city ? `
      <tr>
        <td style="padding:8px 0;color:#9CA3AF;font-size:11px;">Ubicación</td>
        <td style="padding:8px 0;text-align:right;color:#6B7280;font-size:12px;">${[payload.user.city, payload.user.country].filter(Boolean).join(', ')}</td>
      </tr>` : ''}
    </table>

    <!-- CTA -->
    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="border-radius:10px;background:linear-gradient(135deg,#fbbf24 0%,#f59e0b 100%);">
          <a href="${APP_URL}/admin/purchases"
             style="display:inline-block;color:#ffffff;text-decoration:none;font-weight:800;font-size:13px;padding:14px 32px;border-radius:10px;letter-spacing:0.5px;">
            Revisar solicitud →
          </a>
        </td>
      </tr>
    </table>
  `

  try {
    await transporter.sendMail({
      from: `"MY DIAMOND · Admin" <${process.env.GMAIL_USER}>`,
      to: ADMIN_NOTIFICATION_EMAIL,
      subject: `⚡ Nueva solicitud ${planLabel} · $${payload.price.toFixed(2)} · ${payload.user.fullName}`,
      html: emailWrapper(content, '#fbbf24'),
    })
    console.log(`[EMAIL] Admin plan request notif sent for ${payload.user.email} → ${ADMIN_NOTIFICATION_EMAIL}`)
    return true
  } catch (err) {
    console.error('[EMAIL] Admin plan request notif error:', err)
    return false
  }
}

/**
 * Aviso al admin cuando un usuario crea una solicitud de compra de SALDO USD para IA.
 */
/**
 * Aviso al admin cuando un plan se ACTIVÓ automáticamente sin intervención
 * (CRYPTO verificado on-chain — el plan ya está activo).
 * Se dispara en:
 *  - POST /api/pack-requests cuando la TX verifica en el primer intento.
 *  - GET /api/purchases/verify (cron) cuando aprueba una PENDING_VERIFICATION.
 *  - POST /api/admin/purchases/[id]/reverify cuando el admin fuerza la re-verificación.
 */
export async function sendAdminPlanAutoActivatedEmail(payload: {
  requestId: string
  plan: string
  price: number
  txHash: string
  amountUsdt?: number | null
  blockNumber?: string | null
  trigger: 'auto-onchain' | 'cron-verify' | 'admin-reverify'
  user: { fullName: string; email: string; username: string; country?: string | null; city?: string | null }
  approvedAt: Date
}): Promise<boolean> {
  const shortId = payload.requestId.slice(0, 8).toUpperCase()
  const planLabel = PLAN_LABEL_FOR_EMAIL[payload.plan] ?? payload.plan
  const dateStr = new Date(payload.approvedAt).toLocaleString('es-BO', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/La_Paz',
  })

  const triggerLabel: Record<string, string> = {
    'auto-onchain': '⚡ Verificado on-chain al instante',
    'cron-verify': '🤖 Auto-verificado por cron periódico',
    'admin-reverify': '👤 Re-verificado por admin manualmente',
  }
  const triggerText = triggerLabel[payload.trigger] ?? 'Verificado on-chain'

  const content = `
    <p style="color:#00FF88;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin:0 0 16px;">✓ Plan activado · USDT verificado</p>

    <h1 style="color:#111827;font-size:22px;font-weight:800;margin:0 0 6px;letter-spacing:-0.3px;line-height:1.3;">
      ${payload.user.fullName} activó ${planLabel}
    </h1>
    <p style="color:#6B7280;font-size:13px;margin:0 0 24px;line-height:1.7;">
      Una compra con USDT fue verificada on-chain y el plan ya está activo. No requiere tu acción.
    </p>

    <!-- request meta -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td style="background:rgba(0,255,136,0.06);border:1px solid rgba(0,255,136,0.20);border-radius:12px;padding:16px 20px;">
          <p style="color:#9CA3AF;font-size:9px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;margin:0 0 4px;">Solicitud</p>
          <p style="color:#00FF88;font-size:20px;font-weight:900;letter-spacing:5px;margin:0 0 6px;font-family:'Courier New',monospace;">#${shortId}</p>
          <p style="color:#6B7280;font-size:11px;margin:0;">${dateStr}</p>
        </td>
      </tr>
    </table>

    <!-- payment details -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr><td colspan="2" style="padding:0 0 8px;border-bottom:1px solid #E4E9F0;"><p style="color:#9CA3AF;font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0;">Detalle del pago</p></td></tr>
      <tr>
        <td style="padding:10px 0;color:#9CA3AF;font-size:11px;width:140px;">Plan</td>
        <td style="padding:10px 0;text-align:right;color:#111827;font-size:13px;font-weight:700;">${planLabel}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#9CA3AF;font-size:11px;">Monto cobrado</td>
        <td style="padding:8px 0;text-align:right;color:#86efac;font-size:18px;font-weight:900;">$${payload.price.toFixed(2)} USD</td>
      </tr>
      ${typeof payload.amountUsdt === 'number' ? `
      <tr>
        <td style="padding:8px 0;color:#9CA3AF;font-size:11px;">USDT recibido</td>
        <td style="padding:8px 0;text-align:right;color:#374151;font-size:12px;font-weight:600;font-family:'Courier New',monospace;">${payload.amountUsdt.toFixed(2)} USDT</td>
      </tr>` : ''}
      <tr>
        <td style="padding:8px 0;color:#9CA3AF;font-size:11px;">Método</td>
        <td style="padding:8px 0;text-align:right;color:#374151;font-size:12px;font-weight:600;">🪙 Crypto · USDT-BEP20</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#9CA3AF;font-size:11px;">Verificación</td>
        <td style="padding:8px 0;text-align:right;color:#6B7280;font-size:11px;">${triggerText}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#9CA3AF;font-size:11px;">TX Hash</td>
        <td style="padding:8px 0;text-align:right;">
          <a href="https://bscscan.com/tx/${payload.txHash}" target="_blank" style="color:#60a5fa;text-decoration:none;font-size:11px;font-weight:600;font-family:'Courier New',monospace;">${payload.txHash.slice(0, 10)}...${payload.txHash.slice(-8)} ↗</a>
        </td>
      </tr>
      ${payload.blockNumber ? `
      <tr>
        <td style="padding:8px 0;color:#9CA3AF;font-size:11px;">Block</td>
        <td style="padding:8px 0;text-align:right;color:#6B7280;font-size:11px;font-family:'Courier New',monospace;">#${payload.blockNumber}</td>
      </tr>` : ''}
    </table>

    <!-- user info -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr><td colspan="2" style="padding:0 0 8px;border-bottom:1px solid #E4E9F0;"><p style="color:#9CA3AF;font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0;">Usuario</p></td></tr>
      <tr>
        <td style="padding:10px 0;color:#9CA3AF;font-size:11px;width:140px;">Nombre</td>
        <td style="padding:10px 0;text-align:right;color:#111827;font-size:13px;font-weight:700;">${payload.user.fullName}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#9CA3AF;font-size:11px;">Usuario</td>
        <td style="padding:8px 0;text-align:right;color:#6B7280;font-size:12px;">@${payload.user.username}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#9CA3AF;font-size:11px;">Email</td>
        <td style="padding:8px 0;text-align:right;color:#6B7280;font-size:12px;">${payload.user.email}</td>
      </tr>
      ${payload.user.country || payload.user.city ? `
      <tr>
        <td style="padding:8px 0;color:#9CA3AF;font-size:11px;">Ubicación</td>
        <td style="padding:8px 0;text-align:right;color:#6B7280;font-size:12px;">${[payload.user.city, payload.user.country].filter(Boolean).join(', ')}</td>
      </tr>` : ''}
    </table>

    <!-- CTA -->
    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="border-radius:10px;background:linear-gradient(135deg,#1fb8bb 0%,#147e95 48%,#233B8F 100%);">
          <a href="${APP_URL}/admin/purchases?status=APPROVED"
             style="display:inline-block;color:#ffffff;text-decoration:none;font-weight:800;font-size:13px;padding:14px 32px;border-radius:10px;letter-spacing:0.5px;">
            Ver en panel admin →
          </a>
        </td>
      </tr>
    </table>
  `

  try {
    await transporter.sendMail({
      from: `"MY DIAMOND · Admin" <${process.env.GMAIL_USER}>`,
      to: ADMIN_NOTIFICATION_EMAIL,
      subject: `✓ Plan ${planLabel} activado · $${payload.price.toFixed(2)} · ${payload.user.fullName}`,
      html: emailWrapper(content, '#00FF88'),
    })
    console.log(`[EMAIL] Admin plan auto-activated notif sent (${payload.trigger}) for ${payload.user.email} → ${ADMIN_NOTIFICATION_EMAIL}`)
    return true
  } catch (err) {
    console.error('[EMAIL] Admin plan auto-activated notif error:', err)
    return false
  }
}

/**
 * Aviso al admin cuando un saldo IA se ACREDITÓ automáticamente sin intervención
 * (CRYPTO verificado on-chain). El saldo ya está activo en el balance del usuario.
 *
 * Se dispara en:
 *  - POST /api/credits/purchase cuando la TX USDT verifica en el primer intento.
 *  - GET /api/purchases/verify (cron) cuando aprueba una CreditPurchaseRequest PENDING_VERIFICATION.
 *  - POST /api/admin/credit-purchases/[id]/reverify cuando el admin fuerza re-verificación.
 */
export async function sendAdminCreditAutoActivatedEmail(payload: {
  requestId: string
  amountUsd: number
  txHash: string
  amountUsdt?: number | null
  blockNumber?: string | null
  trigger: 'auto-onchain' | 'cron-verify' | 'admin-reverify'
  user: { fullName: string; email: string; username: string; country?: string | null; city?: string | null; newBalanceUsd: number }
  approvedAt: Date
}): Promise<boolean> {
  const shortId = payload.requestId.slice(0, 8).toUpperCase()
  const dateStr = new Date(payload.approvedAt).toLocaleString('es-BO', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/La_Paz',
  })

  const triggerLabel: Record<string, string> = {
    'auto-onchain': '⚡ Verificado on-chain al instante',
    'cron-verify': '🤖 Auto-verificado por cron periódico',
    'admin-reverify': '👤 Re-verificado por admin manualmente',
  }
  const triggerText = triggerLabel[payload.trigger] ?? 'Verificado on-chain'

  const content = `
    <p style="color:#a78bfa;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin:0 0 16px;">✓ Saldo IA acreditado · USDT verificado</p>

    <h1 style="color:#111827;font-size:22px;font-weight:800;margin:0 0 6px;letter-spacing:-0.3px;line-height:1.3;">
      ${payload.user.fullName} cargó +$${payload.amountUsd.toFixed(2)} USD
    </h1>
    <p style="color:#6B7280;font-size:13px;margin:0 0 24px;line-height:1.7;">
      Una compra de saldo IA con USDT fue verificada on-chain y el saldo ya está disponible en el balance del usuario. No requiere tu acción.
    </p>

    <!-- request meta -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td style="background:rgba(162,102,255,0.08);border:1px solid rgba(162,102,255,0.25);border-radius:12px;padding:16px 20px;">
          <p style="color:#9CA3AF;font-size:9px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;margin:0 0 4px;">Solicitud</p>
          <p style="color:#a78bfa;font-size:20px;font-weight:900;letter-spacing:5px;margin:0 0 6px;font-family:'Courier New',monospace;">#${shortId}</p>
          <p style="color:#6B7280;font-size:11px;margin:0;">${dateStr}</p>
        </td>
      </tr>
    </table>

    <!-- balance card -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td style="background:rgba(52,211,153,0.06);border:1px solid rgba(52,211,153,0.20);border-radius:12px;padding:14px 18px;text-align:center;">
          <p style="color:#9CA3AF;font-size:9px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;margin:0 0 4px;">Nuevo saldo del usuario</p>
          <p style="color:#86efac;font-size:24px;font-weight:900;margin:0;font-family:'Courier New',monospace;">$${payload.user.newBalanceUsd.toFixed(2)} USD</p>
        </td>
      </tr>
    </table>

    <!-- payment details -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr><td colspan="2" style="padding:0 0 8px;border-bottom:1px solid #E4E9F0;"><p style="color:#9CA3AF;font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0;">Detalle del pago</p></td></tr>
      <tr>
        <td style="padding:10px 0;color:#9CA3AF;font-size:11px;width:140px;">Monto acreditado</td>
        <td style="padding:10px 0;text-align:right;color:#86efac;font-size:18px;font-weight:900;">+$${payload.amountUsd.toFixed(2)} USD</td>
      </tr>
      ${typeof payload.amountUsdt === 'number' ? `
      <tr>
        <td style="padding:8px 0;color:#9CA3AF;font-size:11px;">USDT recibido</td>
        <td style="padding:8px 0;text-align:right;color:#374151;font-size:12px;font-weight:600;font-family:'Courier New',monospace;">${payload.amountUsdt.toFixed(2)} USDT</td>
      </tr>` : ''}
      <tr>
        <td style="padding:8px 0;color:#9CA3AF;font-size:11px;">Método</td>
        <td style="padding:8px 0;text-align:right;color:#374151;font-size:12px;font-weight:600;">🪙 Crypto · USDT-BEP20</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#9CA3AF;font-size:11px;">Verificación</td>
        <td style="padding:8px 0;text-align:right;color:#6B7280;font-size:11px;">${triggerText}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#9CA3AF;font-size:11px;">TX Hash</td>
        <td style="padding:8px 0;text-align:right;">
          <a href="https://bscscan.com/tx/${payload.txHash}" target="_blank" style="color:#60a5fa;text-decoration:none;font-size:11px;font-weight:600;font-family:'Courier New',monospace;">${payload.txHash.slice(0, 10)}...${payload.txHash.slice(-8)} ↗</a>
        </td>
      </tr>
      ${payload.blockNumber ? `
      <tr>
        <td style="padding:8px 0;color:#9CA3AF;font-size:11px;">Block</td>
        <td style="padding:8px 0;text-align:right;color:#6B7280;font-size:11px;font-family:'Courier New',monospace;">#${payload.blockNumber}</td>
      </tr>` : ''}
    </table>

    <!-- user info -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr><td colspan="2" style="padding:0 0 8px;border-bottom:1px solid #E4E9F0;"><p style="color:#9CA3AF;font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0;">Usuario</p></td></tr>
      <tr>
        <td style="padding:10px 0;color:#9CA3AF;font-size:11px;width:140px;">Nombre</td>
        <td style="padding:10px 0;text-align:right;color:#111827;font-size:13px;font-weight:700;">${payload.user.fullName}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#9CA3AF;font-size:11px;">Usuario</td>
        <td style="padding:8px 0;text-align:right;color:#6B7280;font-size:12px;">@${payload.user.username}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#9CA3AF;font-size:11px;">Email</td>
        <td style="padding:8px 0;text-align:right;color:#6B7280;font-size:12px;">${payload.user.email}</td>
      </tr>
      ${payload.user.country || payload.user.city ? `
      <tr>
        <td style="padding:8px 0;color:#9CA3AF;font-size:11px;">Ubicación</td>
        <td style="padding:8px 0;text-align:right;color:#6B7280;font-size:12px;">${[payload.user.city, payload.user.country].filter(Boolean).join(', ')}</td>
      </tr>` : ''}
    </table>

    <!-- CTA -->
    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="border-radius:10px;background:linear-gradient(135deg,#1fb8bb 0%,#147e95 48%,#233B8F 100%);">
          <a href="${APP_URL}/admin/credit-purchases?status=APPROVED"
             style="display:inline-block;color:#ffffff;text-decoration:none;font-weight:800;font-size:13px;padding:14px 32px;border-radius:10px;letter-spacing:0.5px;">
            Ver en panel admin →
          </a>
        </td>
      </tr>
    </table>
  `

  try {
    await transporter.sendMail({
      from: `"MY DIAMOND · Admin" <${process.env.GMAIL_USER}>`,
      to: ADMIN_NOTIFICATION_EMAIL,
      subject: `✓ Saldo IA acreditado · +$${payload.amountUsd.toFixed(2)} USD · ${payload.user.fullName}`,
      html: emailWrapper(content, '#a78bfa'),
    })
    console.log(`[EMAIL] Admin credit auto-activated notif sent (${payload.trigger}) for ${payload.user.email} → ${ADMIN_NOTIFICATION_EMAIL}`)
    return true
  } catch (err) {
    console.error('[EMAIL] Admin credit auto-activated notif error:', err)
    return false
  }
}

export async function sendAdminNewCreditPurchaseEmail(payload: {
  requestId: string
  amountUsd: number
  paymentMethod: string
  paymentProofUrl?: string | null
  notes?: string | null
  user: { fullName: string; email: string; username: string; country?: string | null; city?: string | null; aiBalanceUsd: number }
  createdAt: Date
}): Promise<boolean> {
  const shortId = payload.requestId.slice(0, 8).toUpperCase()
  const paymentLabel = PAYMENT_LABEL_FOR_EMAIL[payload.paymentMethod] ?? payload.paymentMethod
  const dateStr = new Date(payload.createdAt).toLocaleString('es-BO', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/La_Paz',
  })

  const proofBlock = payload.paymentProofUrl
    ? `
    <tr>
      <td style="padding:8px 0;color:#9CA3AF;font-size:11px;">Comprobante</td>
      <td style="padding:8px 0;text-align:right;">
        <a href="${payload.paymentProofUrl}" target="_blank" style="color:#60a5fa;text-decoration:none;font-size:12px;font-weight:600;">Ver imagen ↗</a>
      </td>
    </tr>`
    : `
    <tr>
      <td style="padding:8px 0;color:#9CA3AF;font-size:11px;">Comprobante</td>
      <td style="padding:8px 0;text-align:right;color:#f87171;font-size:11px;font-style:italic;">⚠ No adjuntado</td>
    </tr>`

  const notesBlock = payload.notes
    ? `
    <tr>
      <td colspan="2" style="padding:10px 0 0;color:#6B7280;font-size:11px;font-style:italic;line-height:1.6;border-top:1px solid #E4E9F0;margin-top:8px;">
        💬 "${payload.notes}"
      </td>
    </tr>`
    : ''

  const newBalance = payload.user.aiBalanceUsd + payload.amountUsd

  const content = `
    <p style="color:#a78bfa;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin:0 0 16px;">💼 Compra de saldo IA · Pendiente</p>

    <h1 style="color:#111827;font-size:22px;font-weight:800;margin:0 0 6px;letter-spacing:-0.3px;line-height:1.3;">
      ${payload.user.fullName} solicita +$${payload.amountUsd.toFixed(2)} USD
    </h1>
    <p style="color:#6B7280;font-size:13px;margin:0 0 24px;line-height:1.7;">
      Hay una nueva solicitud de recarga de saldo IA esperando tu aprobación.
    </p>

    <!-- request meta -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td style="background:rgba(162,102,255,0.08);border:1px solid rgba(162,102,255,0.25);border-radius:12px;padding:16px 20px;">
          <p style="color:#9CA3AF;font-size:9px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;margin:0 0 4px;">Solicitud</p>
          <p style="color:#a78bfa;font-size:20px;font-weight:900;letter-spacing:5px;margin:0 0 6px;font-family:'Courier New',monospace;">#${shortId}</p>
          <p style="color:#6B7280;font-size:11px;margin:0;">${dateStr}</p>
        </td>
      </tr>
    </table>

    <!-- balance impact -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td style="background:rgba(52,211,153,0.06);border:1px solid rgba(52,211,153,0.20);border-radius:12px;padding:14px 18px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <p style="color:#9CA3AF;font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 4px;">Saldo actual</p>
                <p style="color:#374151;font-size:16px;font-weight:700;margin:0;font-family:'Courier New',monospace;">$${payload.user.aiBalanceUsd.toFixed(2)}</p>
              </td>
              <td style="text-align:center;color:#9CA3AF;font-size:18px;font-weight:300;width:40px;">→</td>
              <td style="text-align:right;">
                <p style="color:#9CA3AF;font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 4px;">Después de aprobar</p>
                <p style="color:#86efac;font-size:20px;font-weight:900;margin:0;font-family:'Courier New',monospace;">$${newBalance.toFixed(2)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- payment details -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr><td colspan="2" style="padding:0 0 8px;border-bottom:1px solid #E4E9F0;"><p style="color:#9CA3AF;font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0;">Detalle del pago</p></td></tr>
      <tr>
        <td style="padding:10px 0;color:#9CA3AF;font-size:11px;width:140px;">Monto solicitado</td>
        <td style="padding:10px 0;text-align:right;color:#86efac;font-size:18px;font-weight:900;">+$${payload.amountUsd.toFixed(2)} USD</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#9CA3AF;font-size:11px;">Método</td>
        <td style="padding:8px 0;text-align:right;color:#374151;font-size:12px;font-weight:600;">${paymentLabel}</td>
      </tr>
      ${proofBlock}
      ${notesBlock}
    </table>

    <!-- user info -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr><td colspan="2" style="padding:0 0 8px;border-bottom:1px solid #E4E9F0;"><p style="color:#9CA3AF;font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0;">Usuario</p></td></tr>
      <tr>
        <td style="padding:10px 0;color:#9CA3AF;font-size:11px;width:140px;">Nombre</td>
        <td style="padding:10px 0;text-align:right;color:#111827;font-size:13px;font-weight:700;">${payload.user.fullName}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#9CA3AF;font-size:11px;">Usuario</td>
        <td style="padding:8px 0;text-align:right;color:#6B7280;font-size:12px;">@${payload.user.username}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#9CA3AF;font-size:11px;">Email</td>
        <td style="padding:8px 0;text-align:right;color:#6B7280;font-size:12px;">${payload.user.email}</td>
      </tr>
      ${payload.user.country || payload.user.city ? `
      <tr>
        <td style="padding:8px 0;color:#9CA3AF;font-size:11px;">Ubicación</td>
        <td style="padding:8px 0;text-align:right;color:#6B7280;font-size:12px;">${[payload.user.city, payload.user.country].filter(Boolean).join(', ')}</td>
      </tr>` : ''}
    </table>

    <!-- CTA -->
    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="border-radius:10px;background:linear-gradient(135deg,#1fb8bb 0%,#147e95 48%,#233B8F 100%);">
          <a href="${APP_URL}/admin/credit-purchases"
             style="display:inline-block;color:#ffffff;text-decoration:none;font-weight:800;font-size:13px;padding:14px 32px;border-radius:10px;letter-spacing:0.5px;">
            Revisar solicitud →
          </a>
        </td>
      </tr>
    </table>
  `

  try {
    await transporter.sendMail({
      from: `"MY DIAMOND · Admin" <${process.env.GMAIL_USER}>`,
      to: ADMIN_NOTIFICATION_EMAIL,
      subject: `💼 Nueva compra de saldo IA · +$${payload.amountUsd.toFixed(2)} · ${payload.user.fullName}`,
      html: emailWrapper(content, '#a78bfa'),
    })
    console.log(`[EMAIL] Admin credit purchase notif sent for ${payload.user.email} → ${ADMIN_NOTIFICATION_EMAIL}`)
    return true
  } catch (err) {
    console.error('[EMAIL] Admin credit purchase notif error:', err)
    return false
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// User notifications — aprobación/rechazo de compra de saldo IA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Email al usuario cuando el admin APROBÓ su compra de saldo IA.
 * Le confirma que el saldo ya está disponible.
 */
export async function sendUserCreditPurchaseApprovedEmail(payload: {
  email: string
  fullName: string
  requestId: string
  amountUsd: number
  newBalanceUsd: number
  paymentMethod: string
  reviewedAt: Date
}): Promise<boolean> {
  const shortId = payload.requestId.slice(0, 8).toUpperCase()
  const paymentLabel = PAYMENT_LABEL_FOR_EMAIL[payload.paymentMethod] ?? payload.paymentMethod
  const dateStr = new Date(payload.reviewedAt).toLocaleString('es-BO', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/La_Paz',
  })

  const content = `
    <p style="color:#00FF88;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin:0 0 16px;">✓ Saldo Acreditado</p>

    <h1 style="color:#111827;font-size:22px;font-weight:800;margin:0 0 6px;letter-spacing:-0.3px;line-height:1.3;">
      ¡Tu saldo de IA ya está disponible!
    </h1>
    <p style="color:#6B7280;font-size:13px;margin:0 0 28px;line-height:1.7;">
      Hola <strong style="color:#374151;">${payload.fullName}</strong>, aprobamos tu compra y acreditamos tu saldo en MY DIAMOND.
    </p>

    <!-- amount card -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td style="background:rgba(0,255,136,0.06);border:1px solid rgba(0,255,136,0.20);border-radius:14px;padding:22px 24px;text-align:center;">
          <p style="color:#9CA3AF;font-size:9px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;margin:0 0 6px;">Saldo agregado</p>
          <p style="color:#00FF88;font-size:32px;font-weight:900;margin:0 0 8px;font-family:'Courier New',monospace;">+$${payload.amountUsd.toFixed(2)} USD</p>
          <p style="color:#6B7280;font-size:12px;margin:0;">Nuevo saldo total: <strong style="color:#86efac;">$${payload.newBalanceUsd.toFixed(2)} USD</strong></p>
        </td>
      </tr>
    </table>

    <!-- details -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr><td colspan="2" style="padding:0 0 8px;border-bottom:1px solid #E4E9F0;"><p style="color:#9CA3AF;font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0;">Detalle</p></td></tr>
      <tr>
        <td style="padding:10px 0;color:#9CA3AF;font-size:11px;width:140px;">Solicitud</td>
        <td style="padding:10px 0;text-align:right;color:#111827;font-size:13px;font-weight:700;font-family:'Courier New',monospace;">#${shortId}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#9CA3AF;font-size:11px;">Método</td>
        <td style="padding:8px 0;text-align:right;color:#374151;font-size:12px;font-weight:600;">${paymentLabel}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#9CA3AF;font-size:11px;">Aprobado</td>
        <td style="padding:8px 0;text-align:right;color:#6B7280;font-size:12px;">${dateStr}</td>
      </tr>
    </table>

    <!-- info -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="background:#F7F9FC;border:1px solid #E4E9F0;border-radius:10px;padding:14px 18px;">
          <p style="color:#6B7280;font-size:12px;margin:0;line-height:1.7;">
            Ya podés usar tu saldo en cualquier servicio con IA: <strong style="color:#374151;">Ads, Agentes WhatsApp, Broadcast, Landing Pages</strong>. Cada uso descuenta del saldo según el modelo.
          </p>
        </td>
      </tr>
    </table>

    <!-- CTA -->
    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="border-radius:10px;background:linear-gradient(135deg,#1fb8bb 0%,#147e95 48%,#233B8F 100%);">
          <a href="${APP_URL}/dashboard/wallet"
             style="display:inline-block;color:#ffffff;text-decoration:none;font-weight:800;font-size:13px;padding:14px 32px;border-radius:10px;letter-spacing:0.5px;">
            Ver mi saldo →
          </a>
        </td>
      </tr>
    </table>
  `

  try {
    await transporter.sendMail({
      from: `"MY DIAMOND" <${process.env.GMAIL_USER}>`,
      to: payload.email,
      subject: `✓ Tu saldo IA fue acreditado · +$${payload.amountUsd.toFixed(2)} USD`,
      html: emailWrapper(content, '#00FF88'),
    })
    console.log(`[EMAIL] Credit approved notif sent to ${payload.email}`)
    return true
  } catch (err) {
    console.error('[EMAIL] Credit approved notif error:', err)
    return false
  }
}

/**
 * Email al usuario cuando el admin RECHAZÓ su compra de saldo IA.
 * Le explica el motivo (si lo hay) y le sugiere reintentar.
 */
export async function sendUserCreditPurchaseRejectedEmail(payload: {
  email: string
  fullName: string
  requestId: string
  amountUsd: number
  notes?: string | null
  reviewedAt: Date
}): Promise<boolean> {
  const shortId = payload.requestId.slice(0, 8).toUpperCase()
  const dateStr = new Date(payload.reviewedAt).toLocaleString('es-BO', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/La_Paz',
  })

  const reasonBlock = payload.notes
    ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td style="background:rgba(239,68,68,0.05);border:1px solid rgba(239,68,68,0.18);border-radius:12px;padding:14px 18px;">
          <p style="color:#9CA3AF;font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 6px;">Motivo del rechazo</p>
          <p style="color:#4B5563;font-size:13px;margin:0;line-height:1.6;font-style:italic;">"${payload.notes}"</p>
        </td>
      </tr>
    </table>`
    : ''

  const content = `
    <p style="color:#f87171;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin:0 0 16px;">⚠ Solicitud Rechazada</p>

    <h1 style="color:#111827;font-size:22px;font-weight:800;margin:0 0 6px;letter-spacing:-0.3px;line-height:1.3;">
      Tu compra de saldo no fue aprobada
    </h1>
    <p style="color:#6B7280;font-size:13px;margin:0 0 24px;line-height:1.7;">
      Hola <strong style="color:#374151;">${payload.fullName}</strong>, lamentablemente tu solicitud de <strong style="color:#374151;">$${payload.amountUsd.toFixed(2)} USD</strong> fue rechazada.
    </p>

    <!-- details -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td style="background:rgba(239,68,68,0.05);border:1px solid rgba(239,68,68,0.15);border-radius:12px;padding:16px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <p style="color:#9CA3AF;font-size:9px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;margin:0 0 4px;">Solicitud</p>
                <p style="color:#f87171;font-size:18px;font-weight:900;letter-spacing:4px;margin:0;font-family:'Courier New',monospace;">#${shortId}</p>
              </td>
              <td style="text-align:right;vertical-align:top;">
                <p style="color:#9CA3AF;font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 4px;">Fecha</p>
                <p style="color:#6B7280;font-size:12px;margin:0;">${dateStr}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${reasonBlock}

    <!-- info -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="background:#F7F9FC;border:1px solid #E4E9F0;border-radius:10px;padding:14px 18px;">
          <p style="color:#6B7280;font-size:12px;margin:0;line-height:1.7;">
            Si creés que hay un error o querés reintentar, podés crear una nueva solicitud desde tu panel asegurándote de subir un comprobante claro de la transferencia.
          </p>
        </td>
      </tr>
    </table>

    <!-- CTA -->
    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="border-radius:10px;background:#F7F9FC;border:1px solid #E4E9F0;">
          <a href="${APP_URL}/dashboard/wallet"
             style="display:inline-block;color:#ffffff;text-decoration:none;font-weight:700;font-size:13px;padding:14px 32px;border-radius:10px;letter-spacing:0.5px;">
            Volver a intentar →
          </a>
        </td>
      </tr>
    </table>
  `

  try {
    await transporter.sendMail({
      from: `"MY DIAMOND" <${process.env.GMAIL_USER}>`,
      to: payload.email,
      subject: `Solicitud de saldo IA rechazada · #${shortId}`,
      html: emailWrapper(content, '#f87171'),
    })
    console.log(`[EMAIL] Credit rejected notif sent to ${payload.email}`)
    return true
  } catch (err) {
    console.error('[EMAIL] Credit rejected notif error:', err)
    return false
  }
}

export async function sendCreditsExhaustedEmail(
  email: string,
  fullName: string,
  botName: string,
): Promise<boolean> {
  const content = `
    <!-- label -->
    <p style="color:#F59E0B;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin:0 0 16px;">⚠️ Sin saldo de créditos AI</p>

    <!-- heading -->
    <h1 style="color:#111827;font-size:22px;font-weight:800;margin:0 0 10px;letter-spacing:-0.3px;line-height:1.3;">
      Tus créditos se agotaron
    </h1>
    <p style="color:#6B7280;font-size:13px;margin:0 0 24px;line-height:1.8;">
      Hola <strong style="color:#374151;">${fullName}</strong>, tu bot
      <strong style="color:#F59E0B;">${botName}</strong> no pudo responder a un cliente porque
      se agotaron tus créditos de inteligencia artificial.
    </p>

    <!-- alert card -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="background:rgba(245,158,11,0.05);border:1px solid rgba(245,158,11,0.2);border-radius:12px;padding:18px 20px;">
          <p style="color:#9CA3AF;font-size:9px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;margin:0 0 8px;">¿Qué pasó?</p>
          <p style="color:#374151;font-size:13px;line-height:1.7;margin:0 0 12px;">
            Tu bot recibió un mensaje pero la IA no pudo generar la respuesta porque la cuenta de OpenAI asociada no tiene saldo disponible.
          </p>
          <p style="color:#9CA3AF;font-size:9px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;margin:0 0 8px;">¿Qué hacer?</p>
          <p style="color:#374151;font-size:13px;line-height:1.7;margin:0;">
            Recarga tus créditos AI desde la billetera o configura tu propia API key de OpenAI desde Bots → Credenciales.
          </p>
        </td>
      </tr>
    </table>

    <!-- CTA -->
    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="border-radius:10px;background:linear-gradient(135deg,#1fb8bb 0%,#147e95 48%,#233B8F 100%);">
          <a href="${APP_URL}/dashboard/wallet"
             style="display:inline-block;color:#ffffff;text-decoration:none;font-weight:700;font-size:13px;padding:12px 28px;border-radius:10px;letter-spacing:0.5px;">
            Recargar créditos &rarr;
          </a>
        </td>
      </tr>
    </table>
  `

  try {
    await transporter.sendMail({
      from: `"MY DIAMOND" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: `⚠️ Créditos AI agotados — Bot ${botName} pausado`,
      html: emailWrapper(content, '#F59E0B'),
    })
    console.log(`[EMAIL] Credits exhausted sent to ${email} (bot: ${botName})`)
    return true
  } catch (err) {
    console.error('[EMAIL] Credits exhausted error:', err)
    return false
  }
}

/**
 * Email de alerta cuando el saldo USD del usuario bajó cerca de 0.
 * Disparado UNA sola vez por throttle (24h) desde chargeAtomic.
 */
export async function sendLowBalanceWarningEmail(
  email: string,
  fullName: string,
  balanceUsd: number,
): Promise<boolean> {
  const balanceStr = balanceUsd.toFixed(4)
  const content = `
    <p style="color:#F59E0B;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin:0 0 16px;">⚠️ Saldo bajo de IA</p>

    <h1 style="color:#111827;font-size:22px;font-weight:800;margin:0 0 10px;letter-spacing:-0.3px;line-height:1.3;">
      Tu saldo está por agotarse
    </h1>
    <p style="color:#6B7280;font-size:13px;margin:0 0 24px;line-height:1.8;">
      Hola <strong style="color:#374151;">${fullName}</strong>, te queda apenas
      <strong style="color:#F59E0B;">$${balanceStr} USD</strong> de saldo. Cuando llegue a cero,
      tu bot dejará de responder a los clientes hasta que recargues.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="background:rgba(245,158,11,0.05);border:1px solid rgba(245,158,11,0.2);border-radius:12px;padding:18px 20px;">
          <p style="color:#374151;font-size:13px;line-height:1.7;margin:0;">
            Si tenés tu propia API Key de OpenAI configurada, no hay nada que hacer — tu bot va a seguir
            funcionando con esa. Si en cambio estás usando el saldo del sistema, te conviene recargar ya
            para evitar que el bot quede mudo a mitad de una conversación.
          </p>
        </td>
      </tr>
    </table>

    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="border-radius:10px;background:linear-gradient(135deg,#1fb8bb 0%,#147e95 48%,#233B8F 100%);">
          <a href="${APP_URL}/dashboard/wallet"
             style="display:inline-block;color:#ffffff;text-decoration:none;font-weight:700;font-size:13px;padding:12px 28px;border-radius:10px;letter-spacing:0.5px;">
            Recargar saldo &rarr;
          </a>
        </td>
      </tr>
    </table>
  `

  try {
    await transporter.sendMail({
      from: `"MY DIAMOND" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: `⚠️ Saldo IA bajo — Quedan $${balanceStr} USD`,
      html: emailWrapper(content, '#F59E0B'),
    })
    console.log(`[EMAIL] Low balance warning sent to ${email} (balance: $${balanceStr})`)
    return true
  } catch (err) {
    console.error('[EMAIL] Low balance warning error:', err)
    return false
  }
}

export async function sendBotSaleReportEmail(
  ownerEmail: string,
  ownerName: string,
  botName: string,
  reportText: string,
): Promise<boolean> {
  const content = `
    <!-- label -->
    <p style="color:#00FF88;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin:0 0 16px;">🤖 Bot Messenger — Nueva Venta</p>

    <h1 style="color:#111827;font-size:20px;font-weight:800;margin:0 0 6px;line-height:1.3;">
      Nuevo pedido confirmado
    </h1>
    <p style="color:#6B7280;font-size:13px;margin:0 0 24px;line-height:1.7;">
      Hola <strong style="color:#374151;">${ownerName}</strong>, tu bot
      <strong style="color:#00E5D0;">${botName}</strong> acaba de cerrar una venta en Messenger.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="background:rgba(0,255,136,0.04);border:1px solid rgba(0,255,136,0.15);border-radius:12px;padding:20px 22px;">
          <p style="color:#9CA3AF;font-size:9px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;margin:0 0 10px;">Detalle del pedido</p>
          <p style="color:#374151;font-size:13px;line-height:1.8;margin:0;white-space:pre-wrap;">${reportText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
        </td>
      </tr>
    </table>

    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="border-radius:10px;background:linear-gradient(135deg,#1fb8bb 0%,#147e95 48%,#233B8F 100%);">
          <a href="${APP_URL}/dashboard/services/whatsapp"
             style="display:inline-block;color:#ffffff;text-decoration:none;font-weight:700;font-size:13px;padding:12px 28px;border-radius:10px;letter-spacing:0.5px;">
            Ver en el panel &rarr;
          </a>
        </td>
      </tr>
    </table>
  `

  try {
    await transporter.sendMail({
      from: `"MY DIAMOND" <${process.env.GMAIL_USER}>`,
      to: ownerEmail,
      subject: `🤖 Nueva venta — Bot ${botName} (Messenger)`,
      html: emailWrapper(content, '#00FF88'),
    })
    console.log(`[EMAIL] Bot sale report sent to ${ownerEmail} (bot: ${botName})`)
    return true
  } catch (err) {
    console.error('[EMAIL] Bot sale report error:', err)
    return false
  }
}

export async function sendPasswordResetEmail(
  email: string,
  token: string
): Promise<boolean> {
  const resetLink = `${APP_URL}/reset-password?token=${token}`

  const content = `
    <!-- label -->
    <p style="color:#9B00FF;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin:0 0 16px;">Seguridad de cuenta</p>

    <!-- heading -->
    <h1 style="color:#111827;font-size:22px;font-weight:800;margin:0 0 10px;letter-spacing:-0.3px;line-height:1.3;">
      Restablecer contraseña
    </h1>
    <p style="color:#6B7280;font-size:13px;margin:0 0 32px;line-height:1.8;">
      Recibimos una solicitud para restablecer la contraseña de tu cuenta en
      <span style="color:#374151;font-weight:600;">MY DIAMOND</span>.
      Si no fuiste tú, puedes ignorar este correo.
    </p>

    <!-- divider -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr><td style="height:1px;background:#F7F9FC;"></td></tr>
    </table>

    <!-- CTA -->
    <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="border-radius:10px;background:linear-gradient(135deg,#7B00EF 0%,#00E5D0 100%);">
          <a href="${resetLink}"
             style="display:inline-block;color:#ffffff;text-decoration:none;font-weight:700;font-size:13px;padding:12px 30px;border-radius:10px;letter-spacing:0.5px;">
            Restablecer contraseña &rarr;
          </a>
        </td>
      </tr>
    </table>

    <!-- link box -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td style="background:#F7F9FC;border:1px solid #E4E9F0;border-radius:10px;padding:14px 18px;">
          <p style="color:#9CA3AF;font-size:9px;font-weight:600;letter-spacing:2px;text-transform:uppercase;margin:0 0 5px;">O copia este enlace</p>
          <p style="color:rgba(155,0,255,0.65);font-size:11px;margin:0;word-break:break-all;font-family:'Courier New',Courier,monospace;">${resetLink}</p>
        </td>
      </tr>
    </table>

    <!-- warning -->
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="background:rgba(255,180,0,0.03);border:1px solid rgba(255,180,0,0.1);border-radius:9px;padding:12px 16px;">
          <p style="color:rgba(255,180,0,0.55);font-size:11px;margin:0;line-height:1.6;">
            Este enlace expira en <strong style="color:rgba(255,180,0,0.75);">1 hora</strong>. Si no solicitaste esto, tu cuenta sigue segura.
          </p>
        </td>
      </tr>
    </table>
  `

  try {
    await transporter.sendMail({
      from: `"MY DIAMOND" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Restablecer contraseña — MY DIAMOND',
      html: emailWrapper(content, '#9B00FF'),
    })
    console.log(`[EMAIL] Reset sent to ${email}`)
    return true
  } catch (err) {
    console.error('[EMAIL] Reset error:', err)
    return false
  }
}

export async function sendDeviceVerificationEmail(
  email: string,
  fullName: string,
  code: string
): Promise<boolean> {
  const content = `
    <p style="color:#F59E0B;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin:0 0 16px;">Verificación de dispositivo</p>

    <h1 style="color:#111827;font-size:22px;font-weight:800;margin:0 0 10px;letter-spacing:-0.3px;line-height:1.3;">
      Nuevo dispositivo detectado
    </h1>
    <p style="color:#6B7280;font-size:13px;margin:0 0 28px;line-height:1.8;">
      Hola <span style="color:#374151;font-weight:600;">${fullName}</span>, detectamos un intento de inicio de sesión desde un dispositivo no reconocido. Ingresa el código de verificación para continuar.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td align="center" style="background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.2);border-radius:14px;padding:28px 24px;">
          <p style="color:#6B7280;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px;">Tu código de verificación</p>
          <p style="color:#F59E0B;font-size:40px;font-weight:900;letter-spacing:10px;margin:0;font-family:monospace;">${code}</p>
          <p style="color:#9CA3AF;font-size:11px;margin:12px 0 0;">Válido por 10 minutos</p>
        </td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:0;">
      <tr>
        <td style="background:#F7F9FC;border:1px solid #E4E9F0;border-radius:10px;padding:14px 18px;">
          <p style="color:#9CA3AF;font-size:12px;margin:0;line-height:1.7;">
            Si no intentaste iniciar sesión, ignora este correo. Tu cuenta permanece segura.
          </p>
        </td>
      </tr>
    </table>
  `

  try {
    await transporter.sendMail({
      from: `"MY DIAMOND" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Código de verificación de dispositivo — MY DIAMOND',
      html: emailWrapper(content, '#F59E0B'),
    })
    console.log(`[EMAIL] Device verification sent to ${email}`)
    return true
  } catch (err) {
    console.error('[EMAIL] Device verification error:', err)
    return false
  }
}

export async function sendAdminOtpEmail(
  email: string,
  fullName: string,
  code: string
): Promise<boolean> {
  const content = `
    <p style="color:#EF4444;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin:0 0 16px;">Acceso al panel admin</p>

    <h1 style="color:#111827;font-size:22px;font-weight:800;margin:0 0 10px;letter-spacing:-0.3px;line-height:1.3;">
      Código de acceso admin
    </h1>
    <p style="color:#6B7280;font-size:13px;margin:0 0 28px;line-height:1.8;">
      Hola <span style="color:#374151;font-weight:600;">${fullName}</span>, se solicitó acceso al panel de administración. Usa este código para continuar.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td align="center" style="background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.2);border-radius:14px;padding:28px 24px;">
          <p style="color:#6B7280;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px;">Tu código de acceso</p>
          <p style="color:#EF4444;font-size:40px;font-weight:900;letter-spacing:10px;margin:0;font-family:monospace;">${code}</p>
          <p style="color:#9CA3AF;font-size:11px;margin:12px 0 0;">Válido por 15 minutos · Sesión de 4 horas</p>
        </td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="background:#F7F9FC;border:1px solid #E4E9F0;border-radius:10px;padding:14px 18px;">
          <p style="color:#9CA3AF;font-size:12px;margin:0;line-height:1.7;">
            Si no solicitaste este acceso, alguien puede estar intentando entrar al panel. Cambia tu contraseña inmediatamente.
          </p>
        </td>
      </tr>
    </table>
  `

  try {
    await transporter.sendMail({
      from: `"MY DIAMOND" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: '🔐 Código de acceso admin — MY DIAMOND',
      html: emailWrapper(content, '#EF4444'),
    })
    console.log(`[EMAIL] Admin OTP sent to ${email}`)
    return true
  } catch (err) {
    console.error('[EMAIL] Admin OTP error:', err)
    return false
  }
}

export async function sendTicketEmail(
  email: string,
  customerName: string,
  ticket: {
    ticketCode: string
    eventTitle: string
    ticketTypeName?: string
    eventDate?: Date | null
    eventLocation?: string | null
    eventImage?: string | null
    quantity: number
    totalPrice: number
    paymentMethod: string
    ticketNumber?: number
    totalTickets?: number
  }
): Promise<boolean> {
  const dateStr = ticket.eventDate
    ? new Date(ticket.eventDate).toLocaleString('es-BO', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/La_Paz' })
    : null

  const isMulti = (ticket.totalTickets ?? 1) > 1
  const ticketLabel = isMulti ? `Entrada ${ticket.ticketNumber} de ${ticket.totalTickets}` : 'Entrada Confirmada'

  const content = `
    <p style="color:#00E5D0;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin:0 0 16px;">🎟 ${ticketLabel}</p>

    <h1 style="color:#111827;font-size:22px;font-weight:800;margin:0 0 6px;letter-spacing:-0.3px;line-height:1.3;">
      ¡Tu entrada está lista!
    </h1>
    <p style="color:#6B7280;font-size:13px;margin:0 0 28px;line-height:1.7;">
      Hola <strong style="color:#374151;">${customerName}</strong>, tu entrada ha sido confirmada. Muestra este código en la puerta del evento.
    </p>

    ${ticket.eventImage ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td style="border-radius:14px;overflow:hidden;background:#F4F6FA;">
          <img src="${ticket.eventImage}" alt="${ticket.eventTitle}" width="100%" style="border-radius:14px;display:block;max-height:220px;object-fit:contain;" />
        </td>
      </tr>
    </table>` : ''}

    <!-- Ticket code block -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td style="background:linear-gradient(135deg,rgba(0,229,208,0.12),rgba(13,30,121,0.18));border:2px solid rgba(0,229,208,0.35);border-radius:16px;padding:24px 20px;text-align:center;">
          <p style="color:#9CA3AF;font-size:9px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin:0 0 12px;">Código de entrada</p>
          <p style="color:#111827;font-size:32px;font-weight:900;letter-spacing:8px;margin:0;font-family:'Courier New',Courier,monospace;">${ticket.ticketCode}</p>
          <p style="color:#9CA3AF;font-size:10px;margin:12px 0 0;">Presenta este código en la entrada del evento</p>
        </td>
      </tr>
    </table>

    <!-- Event info -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td style="background:#F7F9FC;border:1px solid #E4E9F0;border-radius:12px;padding:16px 20px;">
          <p style="color:#9CA3AF;font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 10px;">Detalle del evento</p>
          <p style="color:#111827;font-size:15px;font-weight:800;margin:0 0 8px;">${ticket.eventTitle}</p>
          ${dateStr ? `<p style="color:#6B7280;font-size:12px;margin:0 0 4px;">📅 ${dateStr}</p>` : ''}
          ${ticket.eventLocation ? `<p style="color:#6B7280;font-size:12px;margin:0 0 4px;">📍 ${ticket.eventLocation}</p>` : ''}
          ${ticket.ticketTypeName ? `<p style="color:#6B7280;font-size:12px;margin:0 0 4px;">🏷 ${ticket.ticketTypeName}</p>` : ''}
          <p style="color:#F5A623;font-size:13px;font-weight:700;margin:8px 0 0;">Total: $${ticket.totalPrice.toFixed(2)} USDT</p>
        </td>
      </tr>
    </table>

    <p style="color:#9CA3AF;font-size:11px;text-align:center;margin:0;">
      Este código es de uso único. No lo compartas. Solo es válido una vez en la entrada.
    </p>
  `

  try {
    await transporter.sendMail({
      from: `"MY DIAMOND" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: `🎟 ${isMulti ? `Entrada ${ticket.ticketNumber} de ${ticket.totalTickets}` : 'Tu entrada'}: ${ticket.ticketCode} — ${ticket.eventTitle}`,
      html: emailWrapper(content, '#00E5D0'),
    })
    console.log(`[EMAIL] Ticket sent to ${email} (${ticket.ticketCode})`)
    return true
  } catch (err) {
    console.error('[EMAIL] Ticket email error:', err)
    return false
  }
}

/** Send a single email with ALL tickets from one purchase grouped together */
export async function sendTicketGroupEmail(
  email: string,
  customerName: string,
  event: {
    title: string
    date?: Date | null
    location?: string | null
  },
  tickets: Array<{
    ticketCode: string
    typeName: string
    typeImage?: string | null
  }>,
  totalPrice: number
): Promise<boolean> {
  const dateStr = event.date
    ? new Date(event.date).toLocaleString('es-BO', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/La_Paz' })
    : null

  const isMulti = tickets.length > 1
  const ticketsHtml = tickets.map((t, i) => `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:${i < tickets.length - 1 ? '24px' : '0'};">
      <tr>
        <td style="background:#F7F9FC;border:1px solid #E4E9F0;border-radius:16px;overflow:hidden;">
          <div style="padding:20px;">
            ${isMulti ? `<p style="color:#9CA3AF;font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 10px;">Entrada ${i + 1} de ${tickets.length}</p>` : ''}

            <!-- LA ENTRADA: su diseño (VIP oro / General plata / Invitado ónix) con el QR GRANDE adentro -->
            <a href="${APP_URL}/api/entradas/ticket/${encodeURIComponent(t.ticketCode)}.png" style="text-decoration:none;">
              <img src="${APP_URL}/api/entradas/ticket/${encodeURIComponent(t.ticketCode)}.png"
                   alt="Entrada ${t.typeName} — ${t.ticketCode}" width="100%"
                   style="display:block;width:100%;max-width:460px;height:auto;border-radius:12px;border:0;outline:none;margin:0 auto;" />
            </a>

            <!-- Botón para DESCARGAR la entrada -->
            <table cellpadding="0" cellspacing="0" align="center" style="margin:16px auto 0;">
              <tr>
                <td style="border-radius:10px;background:linear-gradient(135deg,#1fb8bb 0%,#147e95 48%,#233B8F 100%);">
                  <a href="${APP_URL}/api/entradas/ticket/${encodeURIComponent(t.ticketCode)}.png?d=1"
                     style="display:inline-block;color:#ffffff;text-decoration:none;font-weight:700;font-size:13px;padding:12px 26px;border-radius:10px;">
                    ⬇ Descargar mi entrada
                  </a>
                </td>
              </tr>
            </table>

            <div style="text-align:center;">
              <p style="color:#9CA3AF;font-size:11px;margin:12px 0 0;">
                Código: <strong style="color:#374151;font-family:'Courier New',Courier,monospace;letter-spacing:2px;">${t.ticketCode}</strong>
              </p>
              <p style="color:#9CA3AF;font-size:11px;margin:4px 0 0;">Guardá la imagen y mostrá el QR en la puerta.</p>
            </div>
          </div>
        </td>
      </tr>
    </table>
  `).join('')

  const content = `
    <p style="color:#00E5D0;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin:0 0 16px;">🎟 ${isMulti ? `${tickets.length} Entradas Confirmadas` : 'Entrada Confirmada'}</p>

    <h1 style="color:#111827;font-size:22px;font-weight:800;margin:0 0 6px;letter-spacing:-0.3px;line-height:1.3;">
      ¡${isMulti ? 'Tus entradas están' : 'Tu entrada está'} lista${isMulti ? 's' : ''}!
    </h1>
    <p style="color:#6B7280;font-size:13px;margin:0 0 24px;line-height:1.7;">
      Hola <strong style="color:#374151;">${customerName}</strong>, ${isMulti ? `tus ${tickets.length} entradas han sido confirmadas` : 'tu entrada ha sido confirmada'}. Muestra ${isMulti ? 'cada código' : 'el código'} en la puerta del evento.
    </p>

    <!-- Event info -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="background:#F7F9FC;border:1px solid #E4E9F0;border-radius:12px;padding:14px 18px;">
          <p style="color:#9CA3AF;font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 8px;">Evento</p>
          <p style="color:#111827;font-size:15px;font-weight:800;margin:0 0 6px;">${event.title}</p>
          ${dateStr ? `<p style="color:#6B7280;font-size:12px;margin:0 0 3px;">📅 ${dateStr}</p>` : ''}
          ${event.location ? `<p style="color:#6B7280;font-size:12px;margin:0;">📍 ${event.location}</p>` : ''}
        </td>
      </tr>
    </table>

    <!-- All tickets -->
    ${ticketsHtml}

    <!-- Total -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;margin-bottom:20px;">
      <tr>
        <td style="text-align:right;">
          <p style="color:#F5A623;font-size:14px;font-weight:700;margin:0;">Total pagado: $${totalPrice.toFixed(2)} USDT</p>
        </td>
      </tr>
    </table>

    <p style="color:#9CA3AF;font-size:11px;text-align:center;margin:0;">
      ${isMulti ? 'Cada código es de uso único e intransferible. Solo es válido una vez en la entrada.' : 'Este código es de uso único. No lo compartas. Solo es válido una vez en la entrada.'}
    </p>
  `

  try {
    const subjectCodes = tickets.length <= 3
      ? tickets.map(t => t.ticketCode).join(', ')
      : `${tickets[0].ticketCode} +${tickets.length - 1} más`

    await transporter.sendMail({
      from: `"MY DIAMOND" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: `🎟 ${isMulti ? `Tus ${tickets.length} entradas` : 'Tu entrada'}: ${subjectCodes} — ${event.title}`,
      html: emailWrapper(content, '#00E5D0'),
    })
    console.log(`[EMAIL] Group ticket sent to ${email} (${tickets.length} codes)`)
    return true
  } catch (err) {
    console.error('[EMAIL] Group ticket email error:', err)
    return false
  }
}

/**
 * Email de "COMPRA RECIBIDA" (pago por transferencia, pendiente de verificar).
 *
 * Antes no se mandaba NADA cuando la compra quedaba pendiente: el comprador se
 * quedaba sin saber si su pago llegó. Este correo confirma que la recibimos y
 * avisa que la entrada con el QR llega apenas se verifique el pago.
 */
export async function sendTicketPendingEmail(
  email: string,
  customerName: string,
  event: { title: string; date?: Date | null; location?: string | null },
  quantity: number,
  totalPrice: number,
): Promise<boolean> {
  const dateStr = event.date
    ? new Date(event.date).toLocaleString('es-BO', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/La_Paz' })
    : null

  const content = `
    <h1 style="color:#111827;font-size:22px;font-weight:900;margin:0 0 8px;">¡Recibimos tu compra! ⏳</h1>
    <p style="color:#6B7280;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Hola <strong style="color:#374151;">${customerName}</strong>, ya nos llegó tu comprobante.
      Estamos verificando el pago y, apenas lo confirmemos, te enviamos ${quantity > 1 ? 'tus entradas' : 'tu entrada'} con su código QR por este medio y por WhatsApp.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="background:#F7F9FC;border:1px solid #E4E9F0;border-radius:12px;padding:14px 18px;">
          <p style="color:#9CA3AF;font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 8px;">Evento</p>
          <p style="color:#111827;font-size:15px;font-weight:800;margin:0 0 6px;">${event.title}</p>
          ${dateStr ? `<p style="color:#6B7280;font-size:12px;margin:0 0 3px;">📅 ${dateStr}</p>` : ''}
          ${event.location ? `<p style="color:#6B7280;font-size:12px;margin:0;">📍 ${event.location}</p>` : ''}
        </td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.3);border-radius:12px;padding:14px 18px;text-align:center;">
          <p style="color:#f59e0b;font-size:13px;font-weight:800;margin:0 0 4px;">⏳ Pago en verificación</p>
          <p style="color:#6B7280;font-size:12px;margin:0;">
            ${quantity} ${quantity > 1 ? 'entradas' : 'entrada'} · Total Bs ${totalPrice.toFixed(2)}
          </p>
        </td>
      </tr>
    </table>

    <p style="color:#9CA3AF;font-size:12px;line-height:1.6;margin:0;">
      Te avisamos apenas esté lista. ¡Gracias por tu compra! 💎
    </p>
  `

  try {
    await transporter.sendMail({
      from: `"MY DIAMOND" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: `⏳ Recibimos tu compra — ${event.title}`,
      html: emailWrapper(content, '#f59e0b'),
    })
    console.log(`[EMAIL] Pending purchase sent to ${email}`)
    return true
  } catch (err) {
    console.error('[EMAIL] Pending purchase email error:', err)
    return false
  }
}
