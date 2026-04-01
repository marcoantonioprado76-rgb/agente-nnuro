/**
 * Wrapper that patches the standalone Next.js server to serve public/ files.
 *
 * The Next.js standalone output's server.js does NOT serve public/ directory.
 * This script starts a lightweight proxy on the same port that:
 * 1. Checks if the request matches a file in public/ → serves it directly
 * 2. Otherwise → proxies to the Next.js standalone server on an internal port
 */

import { createServer, request as httpRequest } from 'http'
import { readFile, stat } from 'fs/promises'
import { join, extname } from 'path'
import { spawn } from 'child_process'

const port = parseInt(process.env.PORT || '3000', 10)
const hostname = process.env.HOSTNAME || '0.0.0.0'
const nextPort = port + 1 // Next.js runs on internal port
const publicDir = join(process.cwd(), 'public')

const MIME = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.webp': 'image/webp', '.json': 'application/json', '.js': 'application/javascript',
  '.css': 'text/css', '.html': 'text/html', '.txt': 'text/plain',
  '.xml': 'application/xml', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
}

async function tryServePublic(pathname, res) {
  const ext = extname(pathname).toLowerCase()
  if (!ext) return false
  const filePath = join(publicDir, pathname)
  if (!filePath.startsWith(publicDir)) return false
  try {
    const s = await stat(filePath)
    if (!s.isFile()) return false
    const data = await readFile(filePath)
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': data.length,
      'Cache-Control': 'public, max-age=3600, must-revalidate',
    })
    res.end(data)
    return true
  } catch { return false }
}

function proxyToNext(req, res) {
  const options = {
    hostname: '127.0.0.1',
    port: nextPort,
    path: req.url,
    method: req.method,
    headers: req.headers,
  }

  const proxyReq = httpRequest(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 200, proxyRes.headers)
    proxyRes.pipe(res, { end: true })
  })

  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err.message)
    if (!res.headersSent) {
      res.writeHead(502)
      res.end('Bad Gateway')
    }
  })

  req.pipe(proxyReq, { end: true })
}

// Start Next.js standalone on internal port
const nextProcess = spawn('node', ['server.js'], {
  env: { ...process.env, PORT: String(nextPort), HOSTNAME: '127.0.0.1' },
  stdio: 'inherit',
  cwd: process.cwd(),
})

nextProcess.on('error', (err) => {
  console.error('Failed to start Next.js:', err)
  process.exit(1)
})

// Wait for Next.js to be ready
await new Promise((resolve) => setTimeout(resolve, 3000))

// Start the proxy server on the public port
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${hostname}:${port}`)

    // Try public/ first
    const served = await tryServePublic(url.pathname, res)
    if (served) return

    // Proxy to Next.js
    proxyToNext(req, res)
  } catch (err) {
    console.error('Server error:', err)
    if (!res.headersSent) {
      res.writeHead(500)
      res.end('Internal Server Error')
    }
  }
})

server.keepAliveTimeout = 65_000
server.headersTimeout = 66_000

server.listen(port, hostname, () => {
  console.log(`
╔══════════════════════════════════════════════════╗
║   🚀 Ventas AI Server                           ║
║   Proxy:  http://${hostname}:${port}                    ║
║   Next.js: 127.0.0.1:${nextPort} (internal)            ║
║   Static: public/ served directly ✅             ║
╚══════════════════════════════════════════════════╝
  `)
})

// Graceful shutdown
function shutdown(signal) {
  console.log(`\n${signal} received. Shutting down...`)
  nextProcess.kill('SIGTERM')
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(1), 10_000)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
