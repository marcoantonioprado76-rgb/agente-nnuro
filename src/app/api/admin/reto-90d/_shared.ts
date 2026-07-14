import { NextResponse } from 'next/server'

// ═══════════════════════════════════════════════════════════════════════════
// Helpers compartidos de las rutas admin del Reto 90D.
// NO es una ruta (no se llama `route.ts`), solo un módulo de utilidades.
// ═══════════════════════════════════════════════════════════════════════════

/** Estados válidos de una entrega (paridad con el schema Prisma / submissionService). */
export const VALID_SUBMISSION_STATUSES = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'REVIEW',
  'DUPLICATED',
  'NEEDS_CLARIFICATION',
] as const

export type ValidSubmissionStatus = (typeof VALID_SUBMISSION_STATUSES)[number]

/** ¿El `status` recibido es uno de los válidos? */
export function isValidSubmissionStatus(status: string): status is ValidSubmissionStatus {
  return (VALID_SUBMISSION_STATUSES as readonly string[]).includes(status)
}

/** Valida un parámetro de fecha `YYYY-MM-DD` y que además sea una fecha real. */
export function isValidDateParam(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false
  // Mediodía en La Paz (UTC-4) para caer siempre dentro del día pedido.
  const d = new Date(`${date}T12:00:00.000-04:00`)
  return !Number.isNaN(d.getTime())
}

/**
 * Mapea un error de una mutación admin a una respuesta HTTP segura, SIN filtrar
 * detalles internos al cliente:
 *   - Prisma P2025 (registro inexistente)         → 404
 *   - Otros errores de constraint/relación P2xxx  → 400
 *   - PrismaClientValidationError                 → 400
 *   - Resto                                        → 500 (mensaje genérico)
 * El detalle real queda solo en los logs del servidor.
 */
export function handleRouteError(err: unknown, tag = 'reto-90d'): NextResponse {
  console.error(`[${tag}]`, err)
  const e = err as { code?: unknown; name?: unknown }
  const code = typeof e?.code === 'string' ? e.code : ''
  const name = typeof e?.name === 'string' ? e.name : ''

  if (code === 'P2025') {
    return NextResponse.json({ error: 'Registro no encontrado.' }, { status: 404 })
  }
  if (/^P2\d{3}$/.test(code) || name === 'PrismaClientValidationError') {
    return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 })
  }
  return NextResponse.json({ error: 'Ocurrió un error al procesar la solicitud.' }, { status: 500 })
}
