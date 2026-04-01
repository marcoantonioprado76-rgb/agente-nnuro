import nodemailer from 'nodemailer'

function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })
}

const FROM = `"Ventas AI" <${process.env.GMAIL_USER}>`

// ──────────────────────────────────────────────
// 1. BIENVENIDA
// ──────────────────────────────────────────────
export async function sendWelcomeEmail(email: string, fullName: string) {
  const transporter = createTransporter()
  return transporter.sendMail({
    from: FROM,
    to: email,
    subject: '¡Bienvenido a Ventas AI! 🚀',
    html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f1117;font-family:'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1117;padding:40px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#1a1d27;border-radius:16px;overflow:hidden;max-width:600px;width:100%">
        <tr><td style="background:linear-gradient(135deg,#6c47ff,#00d4ff);padding:40px 40px 30px;text-align:center">
          <h1 style="margin:0;color:#fff;font-size:28px;font-weight:800;letter-spacing:-0.5px">Ventas AI</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px">Agente de ventas inteligente por WhatsApp</p>
        </td></tr>
        <tr><td style="padding:40px">
          <h2 style="margin:0 0 16px;color:#fff;font-size:22px">¡Hola, ${fullName}! 👋</h2>
          <p style="margin:0 0 20px;color:#a0b0c8;font-size:15px;line-height:1.6">
            Tu cuenta ha sido creada exitosamente. Ahora puedes configurar tu agente de ventas con inteligencia artificial y empezar a vender en automático por WhatsApp.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px">
            <tr><td style="background:#242736;border-radius:10px;padding:20px">
              <p style="margin:0 0 12px;color:#fff;font-size:14px;font-weight:700">¿Qué puedes hacer ahora?</p>
              <p style="margin:0 0 8px;color:#a0b0c8;font-size:14px">✅ &nbsp;Crear tu primer bot de ventas</p>
              <p style="margin:0 0 8px;color:#a0b0c8;font-size:14px">✅ &nbsp;Cargar tu catálogo de productos</p>
              <p style="margin:0 0 8px;color:#a0b0c8;font-size:14px">✅ &nbsp;Conectar tu WhatsApp</p>
              <p style="margin:0;color:#a0b0c8;font-size:14px">✅ &nbsp;Ver tus conversaciones y leads</p>
            </td></tr>
          </table>
          <table cellpadding="0" cellspacing="0" style="margin:0 auto">
            <tr><td align="center" style="background:linear-gradient(135deg,#6c47ff,#00d4ff);border-radius:10px;padding:1px">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display:block;background:#1a1d27;border-radius:9px;padding:14px 36px;color:#fff;text-decoration:none;font-size:15px;font-weight:700">Ir al Dashboard →</a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:20px 40px 30px;text-align:center;border-top:1px solid #242736">
          <p style="margin:0;color:#4a5568;font-size:12px">© 2026 Ventas AI · Si no creaste esta cuenta, ignora este correo.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  })
}

// ──────────────────────────────────────────────
// 2. RECUPERACIÓN DE CONTRASEÑA
// ──────────────────────────────────────────────
export async function sendPasswordRecoveryEmail(email: string, fullName: string, resetLink: string) {
  const transporter = createTransporter()
  return transporter.sendMail({
    from: FROM,
    to: email,
    subject: 'Recupera tu contraseña – Ventas AI',
    html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f1117;font-family:'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1117;padding:40px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#1a1d27;border-radius:16px;overflow:hidden;max-width:600px;width:100%">
        <tr><td style="background:linear-gradient(135deg,#6c47ff,#00d4ff);padding:40px 40px 30px;text-align:center">
          <h1 style="margin:0;color:#fff;font-size:28px;font-weight:800">Ventas AI</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px">Recuperación de contraseña</p>
        </td></tr>
        <tr><td style="padding:40px">
          <h2 style="margin:0 0 16px;color:#fff;font-size:22px">Hola, ${fullName} 🔐</h2>
          <p style="margin:0 0 20px;color:#a0b0c8;font-size:15px;line-height:1.6">
            Recibimos una solicitud para restablecer tu contraseña. Haz clic en el botón de abajo para crear una nueva.
          </p>
          <p style="margin:0 0 8px;color:#e2a03f;font-size:13px;font-weight:600">⚠️ Este enlace expira en 1 hora.</p>
          <table cellpadding="0" cellspacing="0" style="margin:24px auto">
            <tr><td align="center" style="background:linear-gradient(135deg,#6c47ff,#00d4ff);border-radius:10px;padding:1px">
              <a href="${resetLink}" style="display:block;background:#1a1d27;border-radius:9px;padding:14px 36px;color:#fff;text-decoration:none;font-size:15px;font-weight:700">Restablecer contraseña →</a>
            </td></tr>
          </table>
          <p style="margin:20px 0 0;color:#4a5568;font-size:13px;line-height:1.5">
            Si no solicitaste este cambio, puedes ignorar este correo. Tu contraseña no cambiará.
          </p>
        </td></tr>
        <tr><td style="padding:20px 40px 30px;text-align:center;border-top:1px solid #242736">
          <p style="margin:0;color:#4a5568;font-size:12px">© 2026 Ventas AI</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  })
}

// ──────────────────────────────────────────────
// 3. COMPRA DE PLAN
// ──────────────────────────────────────────────
export async function sendPlanPurchaseEmail(
  email: string,
  fullName: string,
  planName: string,
  endDate: Date,
  price: number,
  currency: string
) {
  const transporter = createTransporter()
  const endDateStr = endDate.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })

  return transporter.sendMail({
    from: FROM,
    to: email,
    subject: `¡Plan ${planName} activado! Tu acceso está listo – Ventas AI`,
    html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f1117;font-family:'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1117;padding:40px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#1a1d27;border-radius:16px;overflow:hidden;max-width:600px;width:100%">
        <tr><td style="background:linear-gradient(135deg,#6c47ff,#00d4ff);padding:40px 40px 30px;text-align:center">
          <h1 style="margin:0;color:#fff;font-size:28px;font-weight:800">Ventas AI</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px">Confirmación de pago</p>
        </td></tr>
        <tr><td style="padding:40px">
          <h2 style="margin:0 0 8px;color:#fff;font-size:22px">¡Gracias por tu compra, ${fullName}! 🎉</h2>
          <p style="margin:0 0 28px;color:#a0b0c8;font-size:15px;line-height:1.6">Tu suscripción ha sido activada exitosamente.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px">
            <tr><td style="background:linear-gradient(135deg,rgba(108,71,255,0.15),rgba(0,212,255,0.1));border:1px solid rgba(108,71,255,0.3);border-radius:12px;padding:24px">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color:#a0b0c8;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em">Plan adquirido</td>
                  <td align="right" style="color:#a0b0c8;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em">Monto pagado</td>
                </tr>
                <tr>
                  <td style="color:#fff;font-size:22px;font-weight:800;padding-top:4px">${planName}</td>
                  <td align="right" style="color:#6c47ff;font-size:22px;font-weight:800;padding-top:4px">$${price} ${currency}</td>
                </tr>
                <tr>
                  <td colspan="2" style="padding-top:16px;color:#a0b0c8;font-size:13px;border-top:1px solid rgba(255,255,255,0.1)">
                    <span style="display:inline-block;margin-top:12px">📅 &nbsp;Activo hasta: <strong style="color:#fff">${endDateStr}</strong></span>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
          <table cellpadding="0" cellspacing="0" style="margin:0 auto">
            <tr><td align="center" style="background:linear-gradient(135deg,#6c47ff,#00d4ff);border-radius:10px;padding:1px">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display:block;background:#1a1d27;border-radius:9px;padding:14px 36px;color:#fff;text-decoration:none;font-size:15px;font-weight:700">Ir al Dashboard →</a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:20px 40px 30px;text-align:center;border-top:1px solid #242736">
          <p style="margin:0;color:#4a5568;font-size:12px">© 2026 Ventas AI · Gracias por confiar en nosotros.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  })
}

// ──────────────────────────────────────────────
// 4. PLAN VENCIDO
// ──────────────────────────────────────────────
export async function sendPlanExpiredEmail(email: string, fullName: string, planName: string) {
  const transporter = createTransporter()
  return transporter.sendMail({
    from: FROM,
    to: email,
    subject: 'Tu plan ha vencido – Renueva para seguir vendiendo con IA',
    html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f1117;font-family:'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1117;padding:40px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#1a1d27;border-radius:16px;overflow:hidden;max-width:600px;width:100%">
        <tr><td style="background:linear-gradient(135deg,#ff4757,#ff6b35);padding:40px 40px 30px;text-align:center">
          <h1 style="margin:0;color:#fff;font-size:28px;font-weight:800">Ventas AI</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px">Aviso de suscripción</p>
        </td></tr>
        <tr><td style="padding:40px">
          <h2 style="margin:0 0 16px;color:#fff;font-size:22px">Tu plan ${planName} ha vencido ⏰</h2>
          <p style="margin:0 0 20px;color:#a0b0c8;font-size:15px;line-height:1.6">
            Hola <strong style="color:#fff">${fullName}</strong>, tu suscripción ha expirado. Tus bots, productos y configuración están guardados — solo necesitas renovar para reactivarlos.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px">
            <tr><td style="background:#242736;border-radius:10px;padding:20px">
              <p style="margin:0 0 10px;color:#fff;font-size:14px;font-weight:700">¿Qué pasa con mis datos?</p>
              <p style="margin:0 0 8px;color:#a0b0c8;font-size:14px">✅ &nbsp;Tus bots están guardados</p>
              <p style="margin:0 0 8px;color:#a0b0c8;font-size:14px">✅ &nbsp;Tu catálogo de productos está intacto</p>
              <p style="margin:0 0 8px;color:#a0b0c8;font-size:14px">✅ &nbsp;Tus leads y conversaciones se preservan</p>
              <p style="margin:0;color:#ff6b35;font-size:14px">⚠️ &nbsp;El acceso al bot de WhatsApp está suspendido</p>
            </td></tr>
          </table>
          <table cellpadding="0" cellspacing="0" style="margin:0 auto">
            <tr><td align="center" style="background:linear-gradient(135deg,#ff4757,#ff6b35);border-radius:10px;padding:1px">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/subscription" style="display:block;background:#1a1d27;border-radius:9px;padding:14px 36px;color:#fff;text-decoration:none;font-size:15px;font-weight:700">Renovar mi plan →</a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:20px 40px 30px;text-align:center;border-top:1px solid #242736">
          <p style="margin:0;color:#4a5568;font-size:12px">© 2026 Ventas AI · Te esperamos de vuelta.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  })
}
