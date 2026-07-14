/**
 * Diamond Assistant — API: /groups/[id] (FASE 5, funcional)
 * Config de un grupo guardado (AssistantGroup) por su id interno.
 *
 *   PATCH  -> actualiza automationEnabled/aiEnabled/welcomeEnabled/
 *             welcomeTemplateId/allowedHours (solo los campos presentes).
 *   DELETE -> borra la config del grupo.
 */
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

const GROUP_SELECT = {
  id: true,
  agentId: true,
  groupJid: true,
  name: true,
  automationEnabled: true,
  aiEnabled: true,
  welcomeEnabled: true,
  welcomeTemplateId: true,
  privateWelcomeEnabled: true,
  allowedHours: true,
  createdAt: true,
  updatedAt: true,
} as const

const patchSchema = z.object({
  name: z.string().trim().min(1).nullable().optional(),
  automationEnabled: z.boolean().optional(),
  aiEnabled: z.boolean().optional(),
  welcomeEnabled: z.boolean().optional(),
  welcomeTemplateId: z.string().trim().min(1).nullable().optional(),
  privateWelcomeEnabled: z.boolean().optional(),
  allowedHours: z.any().optional(),
})

// PATCH /api/admin/diamond-assistant/groups/[id]
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const body = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    const first = parsed.error.errors[0]?.message ?? 'Datos inválidos.'
    return NextResponse.json({ ok: false, error: first }, { status: 400 })
  }

  const { name, automationEnabled, aiEnabled, welcomeEnabled, welcomeTemplateId, privateWelcomeEnabled, allowedHours } =
    parsed.data

  const data: Prisma.AssistantGroupUncheckedUpdateInput = {}
  if (name !== undefined) data.name = name
  if (automationEnabled !== undefined) data.automationEnabled = automationEnabled
  if (aiEnabled !== undefined) data.aiEnabled = aiEnabled
  if (welcomeEnabled !== undefined) data.welcomeEnabled = welcomeEnabled
  if (welcomeTemplateId !== undefined) data.welcomeTemplateId = welcomeTemplateId
  if (privateWelcomeEnabled !== undefined) data.privateWelcomeEnabled = privateWelcomeEnabled
  if (allowedHours !== undefined) {
    data.allowedHours = allowedHours === null ? Prisma.DbNull : (allowedHours as Prisma.InputJsonValue)
  }

  try {
    const existing = await prisma.assistantGroup.findUnique({
      where: { id: params.id },
      select: { id: true },
    })
    if (!existing) {
      return NextResponse.json({ ok: false, error: 'Grupo no encontrado.' }, { status: 404 })
    }

    const updated = await prisma.assistantGroup.update({
      where: { id: params.id },
      data,
      select: GROUP_SELECT,
    })
    return NextResponse.json({ ok: true, data: updated })
  } catch (err) {
    console.error('[diamond-assistant/groups/:id PATCH]', err)
    return NextResponse.json(
      { ok: false, error: 'No se pudo actualizar la configuración del grupo.' },
      { status: 500 },
    )
  }
}

// DELETE /api/admin/diamond-assistant/groups/[id]
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  try {
    const existing = await prisma.assistantGroup.findUnique({
      where: { id: params.id },
      select: { id: true },
    })
    if (!existing) {
      return NextResponse.json({ ok: false, error: 'Grupo no encontrado.' }, { status: 404 })
    }

    await prisma.assistantGroup.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[diamond-assistant/groups/:id DELETE]', err)
    return NextResponse.json(
      { ok: false, error: 'No se pudo eliminar la configuración del grupo.' },
      { status: 500 },
    )
  }
}
