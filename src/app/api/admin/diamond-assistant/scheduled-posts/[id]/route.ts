/**
 * Diamond Assistant — API: /scheduled-posts/[id]
 * PATCH  -> edita campos (body/mediaAssetIds/scheduledAt/repeat/status).
 *           Útil para CANCELAR (status='CANCELLED') o reprogramar.
 * DELETE -> elimina la publicación programada.
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

const patchSchema = z.object({
  body: z.string().nullable().optional(),
  mediaAssetIds: z.array(z.string().trim().min(1)).optional(),
  scheduledAt: z.string().trim().min(1).optional(),
  repeat: z.enum(['NONE', 'INTERVAL', 'DAILY', 'WEEKLY', 'WEEKDAYS']).optional(),
  intervalMinutes: z.number().int().positive().nullable().optional(),
  weekdays: z.array(z.number().int().min(0).max(6)).optional(),
  repeatUntil: z.string().nullable().optional(),
  alsoToPrivate: z.boolean().optional(),
  status: z.enum(['PENDING', 'SENT', 'CANCELLED', 'FAILED']).optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const raw = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(raw)
  if (!parsed.success) {
    const first = parsed.error.errors[0]?.message ?? 'Datos inválidos.'
    return NextResponse.json({ ok: false, error: first }, { status: 400 })
  }
  const { body, mediaAssetIds, scheduledAt, repeat, intervalMinutes, weekdays, repeatUntil, alsoToPrivate, status } = parsed.data

  const data: Prisma.AssistantScheduledPostUpdateInput = {}
  if (body !== undefined) data.body = body?.trim() || null
  if (mediaAssetIds !== undefined) data.mediaAssetIds = mediaAssetIds.filter((v, i, a) => a.indexOf(v) === i)
  if (repeat !== undefined) data.repeat = repeat
  if (intervalMinutes !== undefined) data.intervalMinutes = intervalMinutes
  if (weekdays !== undefined) data.weekdays = Array.from(new Set(weekdays)).sort((a, b) => a - b)
  if (alsoToPrivate !== undefined) data.alsoToPrivate = alsoToPrivate
  if (status !== undefined) data.status = status
  if (repeatUntil !== undefined) {
    if (repeatUntil === null || !repeatUntil.trim()) {
      data.repeatUntil = null
    } else {
      const until = new Date(repeatUntil)
      if (isNaN(until.getTime())) {
        return NextResponse.json({ ok: false, error: 'La fecha de fin es inválida.' }, { status: 400 })
      }
      data.repeatUntil = until
    }
  }
  if (scheduledAt !== undefined) {
    const when = new Date(scheduledAt)
    if (isNaN(when.getTime())) {
      return NextResponse.json({ ok: false, error: 'Fecha y hora inválidas.' }, { status: 400 })
    }
    data.scheduledAt = when
    // Reprogramar una publicación reactiva su envío.
    if (status === undefined) data.status = 'PENDING'
  }

  try {
    const existing = await prisma.assistantScheduledPost.findUnique({
      where: { id: params.id },
      select: { id: true },
    })
    if (!existing) {
      return NextResponse.json({ ok: false, error: 'Publicación no encontrada.' }, { status: 404 })
    }
    const updated = await prisma.assistantScheduledPost.update({
      where: { id: params.id },
      data,
      select: SELECT,
    })
    return NextResponse.json({ ok: true, data: updated })
  } catch (err) {
    console.error('[diamond-assistant/scheduled-posts/:id PATCH]', err)
    return NextResponse.json(
      { ok: false, error: 'No se pudo actualizar la publicación.' },
      { status: 500 },
    )
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  try {
    const existing = await prisma.assistantScheduledPost.findUnique({
      where: { id: params.id },
      select: { id: true },
    })
    if (!existing) {
      return NextResponse.json({ ok: false, error: 'Publicación no encontrada.' }, { status: 404 })
    }
    await prisma.assistantScheduledPost.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[diamond-assistant/scheduled-posts/:id DELETE]', err)
    return NextResponse.json(
      { ok: false, error: 'No se pudo eliminar la publicación.' },
      { status: 500 },
    )
  }
}
