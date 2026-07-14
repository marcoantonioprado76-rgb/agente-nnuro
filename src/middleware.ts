import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rate limiter inline para Edge Runtime (no setInterval, no Node.js APIs)
// Clave: primeros 32 chars del JWT → 1 entrada por usuario
const _apiStore = new Map<string, { count: number; resetAt: number }>()

// Límite por usuario autenticado. 10/10s era demasiado bajo: al cargar una página
// del dashboard se disparan ~12 requests de golpe (analytics, credenciales, productos,
// conversaciones, plan-status, notificaciones…) MÁS el polling de estado cada 3s, lo
// que daba 429 en uso legítimo (y bloqueaba el QR de WhatsApp). 60/10s deja headroom
// de sobra para el dashboard pero sigue frenando floods abusivos.
const API_RL_MAX = 60
const API_RL_WINDOW_MS = 10_000

function dashboardRateLimit(token: string): boolean {
  const key = token.slice(0, 32)
  const now = Date.now()
  const entry = _apiStore.get(key)

  if (!entry || entry.resetAt < now) {
    _apiStore.set(key, { count: 1, resetAt: now + API_RL_WINDOW_MS })
    return true
  }
  if (entry.count >= API_RL_MAX) return false
  entry.count++
  return true
}

// User-Agents de bots, scrapers y herramientas automatizadas
const BOT_UA_PATTERNS = [
  'curl', 'wget', 'python-requests', 'python-urllib', 'httpx',
  'axios', 'node-fetch', 'got/', 'superagent', 'okhttp',
  'java/', 'ruby/', 'go-http', 'libwww', 'scrapy',
  'bot', 'crawl', 'spider', 'scraper', 'headless',
  'phantomjs', 'selenium', 'puppeteer', 'playwright',
]

function isBotRequest(request: NextRequest): boolean {
  const ua = request.headers.get('user-agent') ?? ''
  if (!ua) return true // sin User-Agent → siempre bot
  const lower = ua.toLowerCase()
  return BOT_UA_PATTERNS.some(p => lower.includes(p))
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value
  const { pathname } = request.nextUrl

  // La landing está oculta: la raíz va directo al login (o al dashboard si hay
  // sesión). El archivo de la landing (app/page.tsx) se conserva por si se quiere
  // reactivar; basta con quitar este bloque.
  if (pathname === '/') {
    return NextResponse.redirect(new URL(token ? '/dashboard' : '/login', request.url))
  }

  // Bloquear bots/scrapers en rutas API (excluir webhooks, health check y el
  // cron de verificación de compras — ya protegido por CRON_SECRET).
  //
  // El QR de una entrada (/api/entradas/qr/[code]) queda EXENTO a propósito: es una
  // imagen pública que tienen que poder descargar los servidores de WhatsApp y el
  // proxy de imágenes de Gmail (ninguno se ve como un navegador). Solo devuelve el
  // QR de un código; validarlo/consumirlo sigue requiriendo el panel autenticado.
  // El QR y la ENTRADA completa (imagen) son públicos: los descargan los servidores
  // de Gmail/WhatsApp, que no se ven como un navegador.
  const isPublicTicketQr = pathname.startsWith('/api/entradas/qr/') || pathname.startsWith('/api/entradas/ticket/')
  if (
    pathname.startsWith('/api/') &&
    !pathname.startsWith('/api/webhooks/') &&
    !isPublicTicketQr &&
    pathname !== '/api/health' &&
    pathname !== '/api/purchases/verify'
  ) {
    if (isBotRequest(request)) {
      return new NextResponse(
        JSON.stringify({ error: 'Acceso denegado.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }

  // Rutas protegidas — requieren sesión
  if (!token && (pathname.startsWith('/dashboard') || pathname.startsWith('/admin'))) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Si ya tiene sesión y va a login/registro → dashboard
  if (token && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Rate limiting en todas las rutas /api/ autenticadas
  // Excluir: auth, webhooks (no tienen token → excluidos naturalmente)
  // El polling de estado del QR (cada 3s) se excluye del rate-limit: es un read
  // liviano y CRÍTICO para que aparezca el código QR al vincular WhatsApp.
  if (pathname.startsWith('/api/') && token &&
      !pathname.startsWith('/api/auth/') &&
      !pathname.startsWith('/api/webhooks/') &&
      !pathname.endsWith('/baileys/status')) {
    if (!dashboardRateLimit(token)) {
      return new NextResponse(
        JSON.stringify({ error: 'Demasiadas solicitudes. Espera 10 segundos.' }),
        { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '10' } }
      )
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/admin/:path*', '/login', '/register', '/verify-device', '/api/:path*'],
}
