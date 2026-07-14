/**
 * Diamond Assistant — API: /knowledge (FASE 2, funcional)
 * GET  -> lista los ítems de conocimiento de un agente (requiere ?agentId=...).
 * POST -> crea un ítem de conocimiento para un agente.
 *
 * La base de conocimiento (info de Fase Global, productos, eventos, reto 90D,
 * horarios, links, reglas de respuesta) alimenta las respuestas del agente IA.
 */
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// Selección: exponemos todo lo relevante del ítem al cliente.
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

// GET /api/admin/diamond-assistant/knowledge?agentId=... — ítems del agente.
export async function GET(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const agentId = req.nextUrl.searchParams.get('agentId')?.trim()
  if (!agentId) {
    return NextResponse.json(
      { ok: false, error: 'Falta el parámetro agentId.' },
      { status: 400 },
    )
  }

  try {
    const data = await prisma.knowledgeItem.findMany({
      where: { agentId },
      orderBy: { createdAt: 'desc' },
      select: KNOWLEDGE_SELECT,
    })
    return NextResponse.json({ ok: true, data })
  } catch (err) {
    console.error('[diamond-assistant/knowledge GET]', err)
    return NextResponse.json(
      { ok: false, error: 'No se pudo cargar la base de conocimiento.' },
      { status: 500 },
    )
  }
}

const createSchema = z.object({
  agentId: z.string().trim().min(1, 'Falta el agente.'),
  title: z.string().trim().min(1, 'El título es obligatorio.'),
  content: z.string().trim().min(1, 'El contenido es obligatorio.'),
  category: z.string().trim().min(1).optional(),
  isActive: z.boolean().optional(),
})

// POST /api/admin/diamond-assistant/knowledge — crea un ítem de conocimiento.
export async function POST(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    const first = parsed.error.errors[0]?.message ?? 'Datos inválidos.'
    return NextResponse.json({ ok: false, error: first }, { status: 400 })
  }

  const { agentId, title, content, category, isActive } = parsed.data

  try {
    // Verificamos que el agente exista antes de crear su conocimiento.
    const agent = await prisma.assistantAgent.findUnique({
      where: { id: agentId },
      select: { id: true },
    })
    if (!agent) {
      return NextResponse.json({ ok: false, error: 'Agente no encontrado.' }, { status: 404 })
    }

    const data: Prisma.KnowledgeItemUncheckedCreateInput = {
      agentId,
      title,
      content,
    }
    if (category) data.category = category
    if (isActive !== undefined) data.isActive = isActive

    const created = await prisma.knowledgeItem.create({ data, select: KNOWLEDGE_SELECT })
    return NextResponse.json({ ok: true, data: created }, { status: 201 })
  } catch (err) {
    console.error('[diamond-assistant/knowledge POST]', err)
    return NextResponse.json(
      { ok: false, error: 'No se pudo crear el ítem de conocimiento.' },
      { status: 500 },
    )
  }
}
