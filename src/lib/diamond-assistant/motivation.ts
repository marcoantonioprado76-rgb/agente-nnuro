/**
 * Rotación de FRASES MOTIVACIONALES para las publicaciones programadas.
 *
 * En vez de un worker aparte, se integra en el sistema de "Publicaciones programadas"
 * (que ya tiene UI, historial, repetir y "también al privado"): una publicación cuyo
 * `body` sea el MARCADOR envía, en cada disparo, una frase distinta (rotando).
 * NUNCA lanza.
 */
import { prisma } from '@/lib/prisma'
import { MOTIVATION_PHRASES } from './motivationPhrases'

// Marcador que va como `body` de la publicación programada. Se ve claro en el historial.
export const MOTIVATION_MARKER = '[MOTIVACIÓN DIARIA · frase rotativa 💎]'

export function isMotivationBody(body?: string | null): boolean {
  return !!body && body.trim().startsWith('[MOTIVACIÓN DIARIA')
}

const IDX_KEY = 'diamond_motiv_idx'

/** Próxima frase (con firma) y avanza el índice de rotación. Nunca lanza. */
export async function nextMotivationBody(): Promise<string> {
  let idx = 0
  try {
    const row = await (prisma as any).appSetting.findUnique({ where: { key: IDX_KEY }, select: { value: true } })
    idx = row?.value ? (parseInt(String(row.value), 10) || 0) : 0
  } catch { /* usa 0 */ }

  const phrase = MOTIVATION_PHRASES[idx % MOTIVATION_PHRASES.length]

  try {
    const next = String((idx + 1) % MOTIVATION_PHRASES.length)
    // Raw SQL: la tabla app_settings tiene updated_at NOT NULL (no está en el modelo Prisma).
    await prisma.$executeRawUnsafe(
      `INSERT INTO app_settings (key, value, updated_at) VALUES ($1, $2, now())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      IDX_KEY, next,
    )
  } catch { /* noop */ }

  return `${phrase}\n\n— Equipo NÜRO 💎`
}
