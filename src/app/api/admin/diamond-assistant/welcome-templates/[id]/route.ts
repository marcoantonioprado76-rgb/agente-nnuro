/**
 * Diamond Assistant — API: /welcome-templates/[id] (FASE 2, funcional)
 * PATCH  -> actualiza solo los campos presentes (name/body/mediaAssetId/isActive).
 * DELETE -> elimina la plantilla de bienvenida.
 */
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

const WELCOME_SELECT = {
  id: true,
  agentId: true,
  name: true,
  body: true,
  mediaAssetId: true,
  mediaAssetIds: true,
  kind: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const

const patchSchema = z.object({
  name: z.string().trim().min(1, 'El nombre no puede estar vacío.').optional(),
  body: z.string().trim().min(1, 'El cuerpo del mensaje no puede estar vacío.').optional(),
  // mediaAssetId: undefined = no tocar; '' o null = quitar adjunto; texto = guardar.
  mediaAssetId: z.string().nullable().optional(),
  // mediaAssetIds: undefined = no tocar; lista (posiblemente vacía) = reemplazar.
  mediaAssetIds: z.array(z.string().trim().min(1)).optional(),
  kind: z.enum(['GROUP', 'PRIVATE']).optional(),
  isActive: z.boolean().optional(),
})

// PATCH /api/admin/diamond-assistant/welcome-templates/[id]
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const body = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    const first = parsed.error.errors[0]?.message ?? 'Datos inválidos.'
    return NextResponse.json({ ok: false, error: first }, { status: 400 })
  }

  const { name, body: messageBody, mediaAssetId, mediaAssetIds, kind, isActive } = parsed.data

  const data: Prisma.WelcomeTemplateUpdateInput = {}
  if (name !== undefined) data.name = name
  if (messageBody !== undefined) data.body = messageBody
  if (kind !== undefined) data.kind = kind
  if (isActive !== undefined) data.isActive = isActive
  if (mediaAssetId !== undefined) {
    const trimmed = (mediaAssetId ?? '').trim()
    data.mediaAssetId = trimmed ? trimmed : null
  }
  if (mediaAssetIds !== undefined) {
    // Reemplaza la lista completa (sin duplicados, respetando el orden).
    data.mediaAssetIds = mediaAssetIds.filter((v, i, arr) => arr.indexOf(v) === i)
  }

  try {
    const existing = await prisma.welcomeTemplate.findUnique({
      where: { id: params.id },
      select: { id: true },
    })
    if (!existing) {
      return NextResponse.json({ ok: false, error: 'Plantilla no encontrada.' }, { status: 404 })
    }

    const updated = await prisma.welcomeTemplate.update({
      where: { id: params.id },
      data,
      select: WELCOME_SELECT,
    })
    return NextResponse.json({ ok: true, data: updated })
  } catch (err) {
    console.error('[diamond-assistant/welcome-templates/:id PATCH]', err)
    return NextResponse.json(
      { ok: false, error: 'No se pudo actualizar la plantilla de bienvenida.' },
      { status: 500 },
    )
  }
}

// DELETE /api/admin/diamond-assistant/welcome-templates/[id]
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  try {
    const existing = await prisma.welcomeTemplate.findUnique({
      where: { id: params.id },
      select: { id: true },
    })
    if (!existing) {
      return NextResponse.json({ ok: false, error: 'Plantilla no encontrada.' }, { status: 404 })
    }

    await prisma.welcomeTemplate.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[diamond-assistant/welcome-templates/:id DELETE]', err)
    return NextResponse.json(
      { ok: false, error: 'No se pudo eliminar la plantilla de bienvenida.' },
      { status: 500 },
    )
  }
}
