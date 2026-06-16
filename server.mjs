/**
 * Custom HTTP server for persistent Next.js deployment.
 *
 * WHY: Baileys (WhatsApp library) requires a long-lived Node.js process
 * to maintain WebSocket connections. Vercel serverless kills processes
 * after each request, so WhatsApp connections die immediately.
 *
 * This server wraps the standard Next.js app in a persistent HTTP server
 * that can be deployed to Railway, Render, Fly.io, or any VPS.
 *
 * Usage:
 *   NODE_ENV=production node server.mjs
 */

import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'

const dev = process.env.NODE_ENV !== 'production'
const hostname = '0.0.0.0'
const port = parseInt(process.env.PORT || '3000', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url || '', true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error handling request:', err)
      res.statusCode = 500
      res.end('Internal Server Error')
    }
  })

  // Keep-alive settings to prevent idle disconnections
  server.keepAliveTimeout = 65_000
  server.headersTimeout = 66_000

  server.listen(port, hostname, () => {
    console.log(`
╔══════════════════════════════════════════════════╗
║   🚀 Ventas AI Server running                   ║
║   Mode: ${dev ? 'DEVELOPMENT' : 'PRODUCTION '}                          ║
║   URL:  http://${hostname}:${port}                    ║
║   WhatsApp: Persistent connections enabled ✅    ║
╚══════════════════════════════════════════════════╝
    `)
  })

  // ── Worker de rescate del buffer (red de seguridad) ────────────────────────
  // Recupera mensajes que quedaron en el buffer (buffered=true) si el proceso
  // reinició durante la ventana de 15s. Es opt-in: sólo se activa con
  // ENABLE_DRAIN_WORKER=true para no alterar producción sin querer.
  let drainTimer = null
  if (process.env.ENABLE_DRAIN_WORKER === 'true' && process.env.CRON_SECRET) {
    const intervalMs = parseInt(process.env.DRAIN_INTERVAL_MS || '30000', 10)
    const drainUrl = `http://127.0.0.1:${port}/api/cron/drain?secret=${encodeURIComponent(process.env.CRON_SECRET)}`
    let draining = false
    drainTimer = setInterval(async () => {
      if (draining) return // evita solapar corridas
      draining = true
      try {
        const res = await fetch(drainUrl)
        if (!res.ok) console.error(`[DRAIN] worker respondió ${res.status}`)
      } catch (err) {
        console.error('[DRAIN] worker error:', err?.message || err)
      } finally {
        draining = false
      }
    }, intervalMs)
    if (typeof drainTimer.unref === 'function') drainTimer.unref()
    console.log(`[DRAIN] Worker de rescate ACTIVO cada ${intervalMs}ms`)
  } else {
    console.log('[DRAIN] Worker de rescate desactivado (set ENABLE_DRAIN_WORKER=true y CRON_SECRET para activarlo)')
  }

  // Graceful shutdown
  const shutdown = (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`)
    if (drainTimer) clearInterval(drainTimer)
    server.close(() => {
      console.log('Server closed.')
      process.exit(0)
    })
    // Force exit after 10 seconds
    setTimeout(() => {
      console.error('Forced shutdown after timeout')
      process.exit(1)
    }, 10_000)
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
})
