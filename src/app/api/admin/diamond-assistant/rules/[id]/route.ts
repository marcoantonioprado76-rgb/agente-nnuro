/**
 * Diamond Assistant — API: /rules/[id] (FASE 2, funcional)
 * PATCH  -> actualiza solo los campos presentes (description/type/isActive).
 * DELETE -> elimina la regla de seguridad.
 */
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// Paridad con el enum Prisma DiamondRuleType.
const RULE_TYPES = ['FORBID', 'ESCALATE', 'REQUIRE_APPROVAL'] as const

const RULE_SELECT = {
  id: true,
  agentId: true,
  description: true,
  type: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const

const patchSchema = z.object({
  description: z.string().trim().min(1, 'La descripción no puede estar vacía.').optional(),
  type: z.enum(RULE_TYPES).optional(),
  isActive: z.boolean().optional(),
})

// PATCH /api/admin/diamond-assistant/rules/[id]
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const body = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    const first = parsed.error.errors[0]?.message ?? 'Datos inválidos.'
    return NextResponse.json({ ok: false, error: first }, { status: 400 })
  }

  const { description, type, isActive } = parsed.data

  const data: Prisma.SafetyRuleUpdateInput = {}
  if (description !== undefined) data.description = description
  if (type !== undefined) data.type = type
  if (isActive !== undefined) data.isActive = isActive

  try {
    const existing = await prisma.safetyRule.findUnique({
      where: { id: params.id },
      select: { id: true },
    })
    if (!existing) {
      return NextResponse.json({ ok: false, error: 'Regla no encontrada.' }, { status: 404 })
    }

    const updated = await prisma.safetyRule.update({
      where: { id: params.id },
      data,
      select: RULE_SELECT,
    })
    return NextResponse.json({ ok: true, data: updated })
  } catch (err) {
    console.error('[diamond-assistant/rules/:id PATCH]', err)
    return NextResponse.json(
      { ok: false, error: 'No se pudo actualizar la regla.' },
      { status: 500 },
    )
  }
}

// DELETE /api/admin/diamond-assistant/rules/[id]
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  try {
    const existing = await prisma.safetyRule.findUnique({
      where: { id: params.id },
      select: { id: true },
    })
    if (!existing) {
      return NextResponse.json({ ok: false, error: 'Regla no encontrada.' }, { status: 404 })
    }

    await prisma.safetyRule.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[diamond-assistant/rules/:id DELETE]', err)
    return NextResponse.json(
      { ok: false, error: 'No se pudo eliminar la regla.' },
      { status: 500 },
    )
  }
}
