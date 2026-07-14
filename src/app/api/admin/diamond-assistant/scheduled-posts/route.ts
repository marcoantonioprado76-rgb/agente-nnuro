/**
 * Diamond Assistant — API: /scheduled-posts
 * GET  -> lista publicaciones programadas de un agente (?agentId=, opcional &groupJid=).
 * POST -> crea una publicación programada para un grupo.
 *
 * Una publicación lleva texto (opcional) y/o varias imágenes/videos/flyer/pdf
 * (mediaAssetIds), una fecha/hora (scheduledAt, ISO) y una recurrencia
 * (NONE | DAILY | WEEKLY). El worker (instrumentation) la envía a su hora.
 */
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

const SELECT = {
  id: true,
  agentId: true,
  groupJid: true,
  groupName: true,
  body: true,
  mediaAssetIds: true,
  scheduledAt: true,
  repeat: true,
  intervalMinutes: true,
  weekdays: true,
  repeatUntil: true,
  alsoToPrivate: true,
  status: true,
  lastSentAt: true,
  sentCount: true,
  createdAt: true,
  updatedAt: true,
} as const

const REPEATS = ['NONE', 'INTERVAL', 'DAILY', 'WEEKLY', 'WEEKDAYS'] as const
// Mínimo de intervalo: 15 minutos (evita spam / riesgo de baneo en grupos).
const MIN_INTERVAL_MIN = 15

const WEEKDAY_IDX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
/** Día de la semana (0=domingo … 6=sábado) de un instante EN una zona. */
function weekdayInTz(d: Date, tz: string): number {
  try {
    const wd = new Intl.DateTimeFormat('en-US', { timeZone: tz || 'America/La_Paz', weekday: 'short' }).format(d)
    return WEEKDAY_IDX[wd] ?? d.getUTCDay()
  } catch {
    return d.getUTCDay()
  }
}
/** Adelanta `start` al próximo día permitido (misma hora), si no cae ya en uno. */
function snapToWeekday(start: Date, weekdays: number[], tz: string): Date {
  if (weekdays.includes(weekdayInTz(start, tz))) return start
  let t = start.getTime()
  for (let i = 0; i < 7; i++) {
    t += 86_400_000
    if (weekdays.includes(weekdayInTz(new Date(t), tz))) return new Date(t)
  }
  return start
}

// GET /api/admin/diamond-assistant/scheduled-posts?agentId=...&groupJid=...
export async function GET(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const agentId = req.nextUrl.searchParams.get('agentId')?.trim()
  const groupJid = req.nextUrl.searchParams.get('groupJid')?.trim()
  if (!agentId) {
    return NextResponse.json({ ok: false, error: 'Falta el parámetro agentId.' }, { status: 400 })
  }

  try {
    const data = await prisma.assistantScheduledPost.findMany({
      where: { agentId, ...(groupJid ? { groupJid } : {}) },
      orderBy: [{ status: 'asc' }, { scheduledAt: 'asc' }],
      select: SELECT,
    })
    return NextResponse.json({ ok: true, data })
  } catch (err) {
    console.error('[diamond-assistant/scheduled-posts GET]', err)
    return NextResponse.json(
      { ok: false, error: 'No se pudieron cargar las publicaciones programadas.' },
      { status: 500 },
    )
  }
}

const createSchema = z
  .object({
    agentId: z.string().trim().min(1, 'Falta el agente.'),
    groupJid: z.string().trim().min(1, 'Falta el grupo.'),
    groupName: z.string().trim().optional(),
    body: z.string().optional(),
    mediaAssetIds: z.array(z.string().trim().min(1)).optional(),
    scheduledAt: z.string().trim().min(1, 'Falta la fecha y hora.'),
    repeat: z.enum(REPEATS).optional(),
    intervalMinutes: z.number().int().positive().optional(),
    weekdays: z.array(z.number().int().min(0).max(6)).optional(),
    repeatUntil: z.string().trim().optional(),
    alsoToPrivate: z.boolean().optional(),
  })
  .refine(
    (v) => (v.body && v.body.trim().length > 0) || (v.mediaAssetIds && v.mediaAssetIds.length > 0),
    { message: 'Agrega un mensaje o al menos una imagen/archivo.' },
  )
  .refine(
    (v) => v.repeat !== 'INTERVAL' || (v.intervalMinutes != null && v.intervalMinutes >= MIN_INTERVAL_MIN),
    { message: `Para "cada cierto tiempo", el intervalo mínimo es de ${MIN_INTERVAL_MIN} minutos.` },
  )
  .refine((v) => v.repeat !== 'WEEKDAYS' || (v.weekdays != null && v.weekdays.length > 0), {
    message: 'Elegí al menos un día de la semana.',
  })

// POST /api/admin/diamond-assistant/scheduled-posts
export async function POST(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const raw = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(raw)
  if (!parsed.success) {
    const first = parsed.error.errors[0]?.message ?? 'Datos inválidos.'
    return NextResponse.json({ ok: false, error: first }, { status: 400 })
  }
  const { agentId, groupJid, groupName, body, mediaAssetIds, scheduledAt, repeat, intervalMinutes, weekdays, repeatUntil, alsoToPrivate } =
    parsed.data
  const repeatMode = repeat ?? 'NONE'
  const cleanWeekdays =
    repeatMode === 'WEEKDAYS' ? Array.from(new Set(weekdays ?? [])).sort((a, b) => a - b) : []

  // La fecha debe ser válida y futura (con 30s de tolerancia).
  const when = new Date(scheduledAt)
  if (isNaN(when.getTime())) {
    return NextResponse.json({ ok: false, error: 'Fecha y hora inválidas.' }, { status: 400 })
  }
  if (when.getTime() < Date.now() - 30_000) {
    return NextResponse.json(
      { ok: false, error: 'La fecha y hora ya pasó. Elegí un horario futuro.' },
      { status: 400 },
    )
  }

  // Fecha de fin opcional: válida y posterior al inicio.
  let until: Date | null = null
  if (repeatMode !== 'NONE' && repeatUntil && repeatUntil.trim()) {
    until = new Date(repeatUntil)
    if (isNaN(until.getTime())) {
      return NextResponse.json({ ok: false, error: 'La fecha de fin es inválida.' }, { status: 400 })
    }
    if (until.getTime() <= when.getTime()) {
      return NextResponse.json(
        { ok: false, error: 'La fecha de fin debe ser posterior a la de inicio.' },
        { status: 400 },
      )
    }
  }

  try {
    const agent = await prisma.assistantAgent.findUnique({
      where: { id: agentId },
      select: { id: true, timezone: true },
    })
    if (!agent) {
      return NextResponse.json({ ok: false, error: 'Agente no encontrado.' }, { status: 404 })
    }

    // Para "días específicos", la primera vez cae en el próximo día permitido (misma hora).
    const firstWhen =
      repeatMode === 'WEEKDAYS' ? snapToWeekday(when, cleanWeekdays, agent.timezone) : when

    const data: Prisma.AssistantScheduledPostUncheckedCreateInput = {
      agentId,
      groupJid,
      groupName: groupName?.trim() || null,
      body: body?.trim() || null,
      mediaAssetIds: (mediaAssetIds ?? []).filter((v, i, arr) => arr.indexOf(v) === i),
      scheduledAt: firstWhen,
      repeat: repeatMode,
      intervalMinutes: repeatMode === 'INTERVAL' ? intervalMinutes ?? null : null,
      weekdays: cleanWeekdays,
      repeatUntil: until,
      alsoToPrivate: alsoToPrivate ?? false,
      status: 'PENDING',
      createdBy: (admin as { id?: string }).id ?? null,
    }

    const created = await prisma.assistantScheduledPost.create({ data, select: SELECT })
    return NextResponse.json({ ok: true, data: created }, { status: 201 })
  } catch (err) {
    console.error('[diamond-assistant/scheduled-posts POST]', err)
    return NextResponse.json(
      { ok: false, error: 'No se pudo programar la publicación.' },
      { status: 500 },
    )
  }
}
