import { prisma } from '@/lib/prisma'

// ═══════════════════════════════════════════════════════════════════════════
// Reto 90D — Servicio de retos (Challenge). ADMIN-ONLY, sin UI.
// Lógica de servidor pura sobre el modelo `reto90d_challenges`.
// ═══════════════════════════════════════════════════════════════════════════

/** Zona horaria por defecto del módulo (para calcular "hoy"). */
export const DEFAULT_TIMEZONE = 'America/La_Paz'

export interface CreateChallengeInput {
  name: string
  description?: string | null
  startDate: Date
  endDate: Date
  isActive?: boolean
}

export type UpdateChallengeInput = Partial<CreateChallengeInput>

/**
 * Devuelve la fecha actual (medianoche del día en curso) en la zona horaria
 * indicada, como instante UTC. Usa Intl para resolver el día local sin
 * depender de la zona horaria del servidor.
 */
export function currentDateInTimeZone(timeZone: string = DEFAULT_TIMEZONE): Date {
  const ymd = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date()) // "YYYY-MM-DD" en la zona horaria pedida
  return new Date(`${ymd}T00:00:00.000Z`)
}

/** Crea un nuevo reto. */
export async function createChallenge(data: CreateChallengeInput) {
  try {
    return await prisma.challenge.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        startDate: data.startDate,
        endDate: data.endDate,
        isActive: data.isActive ?? undefined,
      },
    })
  } catch (err) {
    console.error('[reto90d/challengeService] createChallenge failed:', err)
    throw new Error('No se pudo crear el reto')
  }
}

/** Actualiza campos de un reto existente. */
export async function updateChallenge(id: string, data: UpdateChallengeInput) {
  try {
    return await prisma.challenge.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        startDate: data.startDate,
        endDate: data.endDate,
        isActive: data.isActive,
      },
    })
  } catch (err) {
    console.error(`[reto90d/challengeService] updateChallenge failed (id=${id}):`, err)
    throw new Error('No se pudo actualizar el reto')
  }
}

/**
 * Offset en ms tal que: wallClock(zona) = utc + offset. Se calcula con Intl para
 * respetar cualquier zona (America/La_Paz es UTC-4 fijo, sin horario de verano).
 */
function tzOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date)
  const map: Record<string, number> = {}
  for (const p of parts) if (p.type !== 'literal') map[p.type] = Number(p.value)
  const hour = map.hour === 24 ? 0 : map.hour // algunos ICU devuelven 24 a medianoche
  const asUTC = Date.UTC(map.year, map.month - 1, map.day, hour, map.minute, map.second)
  return asUTC - date.getTime()
}

/**
 * Instante UTC del FIN del día (en `timeZone`) que representa `endDate`.
 * El panel guarda endDate como `new Date("YYYY-MM-DD")` = medianoche UTC, así que
 * tomamos su día calendario UTC y devolvemos la medianoche del día SIGUIENTE en
 * `timeZone`. De esta forma el reto sigue activo TODO su último día en La Paz y no
 * se "apaga" 4 h antes (a las 20:00 locales) el día final.
 */
function endOfChallengeDayUTC(endDate: Date, timeZone: string): Date {
  const y = endDate.getUTCFullYear()
  const m = endDate.getUTCMonth()
  const d = endDate.getUTCDate()
  const nextWallMidnightUTC = Date.UTC(y, m, d + 1, 0, 0, 0, 0)
  const offset = tzOffsetMs(new Date(nextWallMidnightUTC), timeZone)
  return new Date(nextWallMidnightUTC - offset)
}

/**
 * Reto activo: `isActive = true`, ya iniciado (startDate ≤ ahora) y cuyo endDate
 * —tratado como FIN DE DÍA en la zona del reto— aún no pasó. Devuelve el más
 * reciente o null. Usa `timeZone` (fallback America/La_Paz) para que el corte del
 * último día sea consistente con submissions y reportes.
 */
export async function getActiveChallenge(timeZone: string = DEFAULT_TIMEZONE) {
  const tz = timeZone || DEFAULT_TIMEZONE
  try {
    // Usamos el instante actual (now) — no la medianoche de la zona — para evitar
    // el desfase horario: un reto que empieza "hoy" queda activo apenas se crea.
    const now = new Date()
    // El corte por endDate se hace en JS para tratarlo como fin-de-día en la zona
    // del reto (no como la medianoche UTC en que lo guarda el panel).
    const candidates = await prisma.challenge.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
      },
      orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
    })
    return candidates.find((c) => endOfChallengeDayUTC(c.endDate, tz) >= now) ?? null
  } catch (err) {
    console.error('[reto90d/challengeService] getActiveChallenge failed:', err)
    throw new Error('No se pudo obtener el reto activo')
  }
}

/** Obtiene un reto por id (o null si no existe). */
export async function getChallenge(id: string) {
  try {
    return await prisma.challenge.findUnique({ where: { id } })
  } catch (err) {
    console.error(`[reto90d/challengeService] getChallenge failed (id=${id}):`, err)
    throw new Error('No se pudo obtener el reto')
  }
}

/** Lista todos los retos, del más reciente al más antiguo. */
export async function listChallenges() {
  try {
    return await prisma.challenge.findMany({
      orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
    })
  } catch (err) {
    console.error('[reto90d/challengeService] listChallenges failed:', err)
    throw new Error('No se pudieron listar los retos')
  }
}

/** Activa o desactiva un reto. */
/** Elimina un reto y TODO lo suyo (tareas, miembros, evidencias, reportes) vía cascada. */
export async function deleteChallenge(id: string) {
  try {
    await prisma.challenge.delete({ where: { id } })
    return true
  } catch (err) {
    console.error(`[reto90d/challengeService] deleteChallenge failed (id=${id}):`, err)
    throw new Error('No se pudo eliminar el reto')
  }
}

export async function setChallengeActive(id: string, isActive: boolean) {
  try {
    return await prisma.challenge.update({
      where: { id },
      data: { isActive },
    })
  } catch (err) {
    console.error(`[reto90d/challengeService] setChallengeActive failed (id=${id}):`, err)
    throw new Error('No se pudo cambiar el estado del reto')
  }
}
