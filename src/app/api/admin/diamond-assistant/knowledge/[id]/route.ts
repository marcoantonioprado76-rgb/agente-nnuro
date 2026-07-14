/**
 * Diamond Assistant — API: /knowledge/[id] (FASE 2, funcional)
 * PATCH  -> actualiza solo los campos presentes (title/content/category/isActive).
 * DELETE -> elimina el ítem de conocimiento.
 */
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

const KNOWLEDGE_SELECT = {
  id: true,
  agentId: true,
  title: true,
  content: true,
  category: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const

const patchSchema = z.object({
  title: z.string().trim().min(1, 'El título no puede estar vacío.').optional(),
  content: z.string().trim().min(1, 'El contenido no puede estar vacío.').optional(),
  // category: undefined = no tocar; '' o null = borrar; texto = guardar.
  category: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
})

// PATCH /api/admin/diamond-assistant/knowledge/[id]
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const body = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    const first = parsed.error.errors[0]?.message ?? 'Datos inválidos.'
    return NextResponse.json({ ok: false, error: first }, { status: 400 })
  }

  const { title, content, category, isActive } = parsed.data

  const data: Prisma.KnowledgeItemUpdateInput = {}
  if (title !== undefined) data.title = title
  if (content !== undefined) data.content = content
  if (isActive !== undefined) data.isActive = isActive
  if (category !== undefined) {
    const trimmed = (category ?? '').trim()
    data.category = trimmed ? trimmed : null
  }

  try {
    const existing = await prisma.knowledgeItem.findUnique({
      where: { id: params.id },
      select: { id: true },
    })
    if (!existing) {
      return NextResponse.json({ ok: false, error: 'Ítem no encontrado.' }, { status: 404 })
    }

    const updated = await prisma.knowledgeItem.update({
      where: { id: params.id },
      data,
      select: KNOWLEDGE_SELECT,
    })
    return NextResponse.json({ ok: true, data: updated })
  } catch (err) {
    console.error('[diamond-assistant/knowledge/:id PATCH]', err)
    return NextResponse.json(
      { ok: false, error: 'No se pudo actualizar el ítem de conocimiento.' },
      { status: 500 },
    )
  }
}

// DELETE /api/admin/diamond-assistant/knowledge/[id]
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  try {
    const existing = await prisma.knowledgeItem.findUnique({
      where: { id: params.id },
      select: { id: true },
    })
    if (!existing) {
      return NextResponse.json({ ok: false, error: 'Ítem no encontrado.' }, { status: 404 })
    }

    await prisma.knowledgeItem.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[diamond-assistant/knowledge/:id DELETE]', err)
    return NextResponse.json(
      { ok: false, error: 'No se pudo eliminar el ítem de conocimiento.' },
      { status: 500 },
    )
  }
}
