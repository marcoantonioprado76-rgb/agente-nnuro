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

  // Graceful shutdown
  const shutdown = (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`)
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
