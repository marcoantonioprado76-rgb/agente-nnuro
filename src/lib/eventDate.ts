/**
 * Validación de la fecha/hora de un EVENTO (módulo Entradas).
 *
 * El input `datetime-local` deja escribir años absurdos (un dedazo como "72026").
 * `new Date("72026-03-30T15:00")` devuelve **Invalid Date**, y al guardarlo Prisma
 * lanzaba un error que se traducía en un "Error interno" 500 sin explicación.
 *
 * `parseEventDate` valida y devuelve un mensaje CLARO en vez de romper.
 */

/** Rango razonable de años para un evento. */
export const EVENT_YEAR_MIN = 2000
export const EVENT_YEAR_MAX = 2100

export type ParsedEventDate =
  | { ok: true; date: Date | null }
  | { ok: false; error: string }

/**
 * Convierte el valor del formulario en una fecha válida.
 *   - vacío/null/undefined → `{ ok: true, date: null }` (el evento puede no tener fecha).
 *   - fecha inválida o año fuera de rango → `{ ok: false, error }` con mensaje claro.
 */
export function parseEventDate(raw: unknown): ParsedEventDate {
  if (raw === null || raw === undefined || String(raw).trim() === '') {
    return { ok: true, date: null }
  }

  const date = new Date(String(raw))
  if (isNaN(date.getTime())) {
    return { ok: false, error: 'La fecha y hora no son válidas. Revisá el año (por ejemplo: 2026).' }
  }

  const year = date.getFullYear()
  if (year < EVENT_YEAR_MIN || year > EVENT_YEAR_MAX) {
    return {
      ok: false,
      error: `El año ${year} no parece correcto. Usá un año entre ${EVENT_YEAR_MIN} y ${EVENT_YEAR_MAX}.`,
    }
  }

  return { ok: true, date }
}
