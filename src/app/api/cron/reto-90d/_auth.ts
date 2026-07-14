import { NextResponse } from 'next/server'
import crypto from 'crypto'

// ═══════════════════════════════════════════════════════════════════════════
// Autorización de los crons del Reto 90D. FAIL-CLOSED: si CRON_SECRET no está
// definido, se rechaza SIEMPRE (nunca "Bearer undefined" pasa). Comparación en
// tiempo constante para evitar timing attacks.
// NO es una ruta (no se llama `route.ts`), solo un módulo de utilidades.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Devuelve `null` si la petición está autorizada, o una `NextResponse` de error
 * lista para retornar si no lo está:
 *   - CRON_SECRET ausente → 500 (mala configuración, fail-closed)
 *   - Header inválido     → 401
 */
export function assertCronAuthorized(req: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('[cron/reto-90d] CRON_SECRET no está definido — se rechaza la petición.')
    return NextResponse.json({ error: 'CRON no configurado.' }, { status: 500 })
  }

  const header = req.headers.get('authorization') ?? ''
  const expected = `Bearer ${secret}`
  const a = Buffer.from(header)
  const b = Buffer.from(expected)
  const ok = a.length === b.length && crypto.timingSafeEqual(a, b)
  if (!ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}
