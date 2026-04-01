/**
 * Next.js Instrumentation Hook
 * Se ejecuta cuando el servidor arranca.
 * Restaura sesiones WhatsApp y programa cron jobs internos.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // WhatsApp y crons SOLO en produccion — en local causa conflicto de sesiones
    const isProduction = process.env.NODE_ENV === 'production'
    if (!isProduction) {
      console.log('[Instrumentation] Modo desarrollo — WhatsApp Manager y crons desactivados')
      return
    }

    console.log('[Instrumentation] Servidor produccion iniciado, inicializando WhatsApp Manager...')
    try {
      const { initWhatsAppManager } = await import('@/lib/whatsapp/manager')
      await initWhatsAppManager()
      console.log('[Instrumentation] WhatsApp Manager inicializado y sesiones restauradas')
    } catch (err) {
      console.error('[Instrumentation] Error inicializando WhatsApp Manager:', err)
    }

    // Programar cron job interno para seguimientos (cada 5 minutos)
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret) {
      const FOLLOWUP_INTERVAL = 5 * 60 * 1000 // 5 minutos
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

      setInterval(async () => {
        try {
          const res = await fetch(`${appUrl}/api/cron/process-followups`, {
            headers: { Authorization: `Bearer ${cronSecret}` },
          })
          if (res.ok) {
            const data = await res.json()
            if (data.sent > 0) {
              console.log(`[Cron Followups] ${data.sent} seguimientos enviados`)
            }
          }
        } catch { /* silent — server may be starting up */ }
      }, FOLLOWUP_INTERVAL)

      console.log('[Instrumentation] Cron de seguimientos programado (cada 5 min)')
    }
  }
}
