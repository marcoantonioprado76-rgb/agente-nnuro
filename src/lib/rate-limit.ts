/**
 * Rate limiter con sliding window.
 * Usa memoria local (Map). En producción con múltiples instancias
 * necesita Redis — reemplaza el store con @upstash/ratelimit.
 *
 * Para upgradear a Redis: https://upstash.com/docs/redis/sdks/ratelimit-ts/overview
 */

interface WindowEntry {
  count: number
  resetAt: number
}

const store = new Map<string, WindowEntry>()

// Limpia entradas expiradas cada 5 minutos para evitar memory leak
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of Array.from(store)) {
    if (entry.resetAt < now) store.delete(key)
  }
}, 5 * 60 * 1000)

interface RateLimitConfig {
  /** Ventana de tiempo en segundos */
  windowSec: number
  /** Máximo de requests por ventana */
  max: number
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

/**
 * Verifica y cuenta un request para la clave dada.
 * @param key  Identificador único (ej: `login:${ip}`, `register:${ip}`)
 */
export function rateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now()
  const windowMs = config.windowSec * 1000

  const entry = store.get(key)

  if (!entry || entry.resetAt < now) {
    // Ventana nueva
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: config.max - 1, resetAt: now + windowMs }
  }

  if (entry.count >= config.max) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count++
  return { allowed: true, remaining: config.max - entry.count, resetAt: entry.resetAt }
}

/** Extrae la IP real del request (compatible con Vercel/proxies) */
export function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

/** Configuraciones predefinidas */
export const RATE_LIMITS = {
  /** Login: 20 intentos por 15 minutos por IP */
  login: { windowSec: 15 * 60, max: 20 },
  /** Register: 5 registros por hora por IP */
  register: { windowSec: 60 * 60, max: 5 },
  /** Device OTP verify: 8 intentos por 15 minutos por IP */
  deviceVerify: { windowSec: 15 * 60, max: 8 },
  /** Admin OTP verify: 5 intentos por 15 minutos por IP */
  adminOtp: { windowSec: 15 * 60, max: 5 },
  /** Activate plan: 3 intentos por hora por usuario */
  activatePlan: { windowSec: 60 * 60, max: 3 },
  /** Withdrawal: 5 solicitudes por hora por usuario */
  withdrawal: { windowSec: 60 * 60, max: 5 },
  /** Upload avatar: 10 por hora por usuario */
  upload: { windowSec: 60 * 60, max: 10 },
} as const
