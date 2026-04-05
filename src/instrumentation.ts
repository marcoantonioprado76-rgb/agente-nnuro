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

    // Global safety net: evitar que errores no-manejados de Baileys tumben el proceso.
    // Baileys emite errores desde WebSockets internos que Node 18+ considera fatales.
    process.on('unhandledRejection', (reason: any) => {
      const msg = reason?.message || String(reason)
      if (msg.includes('Connection Closed') || msg.includes('Stream Errored') || msg.includes('timed out') || msg.includes('WebSocket')) {
        console.warn(`[Instrumentation] Unhandled Baileys rejection (ignorado): ${msg.slice(0, 120)}`)
        return
      }
      console.error('[Instrumentation] Unhandled rejection:', reason)
    })
    process.on('uncaughtException', (err: any) => {
      const msg = err?.message || String(err)
      if (msg.includes('Connection Closed') || msg.includes('Stream Errored') || msg.includes('WebSocket')) {
        console.warn(`[Instrumentation] Uncaught Baileys exception (ignorado): ${msg.slice(0, 120)}`)
        return
      }
      console.error('[Instrumentation] Uncaught exception:', err)
    })

    // Fire-and-forget: NO awaitear. Si bloqueamos aquí, el HTTP server no responde.
    import('@/lib/whatsapp/manager')
      .then(({ initWhatsAppManager }) => initWhatsAppManager())
      .then(() => console.log('[Instrumentation] WhatsApp Manager inicializado'))
      .catch(err => console.error('[Instrumentation] Error inicializando WhatsApp Manager:', err))

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
