/**
 * Diamond Assistant — API: /welcome-templates (FASE 2, funcional)
 * GET  -> lista las plantillas de bienvenida de un agente (requiere ?agentId=...).
 * POST -> crea una plantilla de bienvenida para un agente.
 *
 * El body soporta variables que el agente reemplaza al dar la bienvenida a un
 * nuevo miembro del grupo:
 *   {{nombre}} {{grupo}} {{ciudad}} {{sponsor}} {{fecha}} {{link_reto}} {{nombre_lider}}
 */
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// Selección: exponemos todo lo relevante de la plantilla al cliente.
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

// GET /api/admin/diamond-assistant/welcome-templates?agentId=... — plantillas del agente.
export async function GET(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const agentId = req.nextUrl.searchParams.get('agentId')?.trim()
  const kind = req.nextUrl.searchParams.get('kind')?.trim() // 'GROUP' | 'PRIVATE' (opcional)
  if (!agentId) {
    return NextResponse.json(
      { ok: false, error: 'Falta el parámetro agentId.' },
      { status: 400 },
    )
  }

  try {
    const data = await prisma.welcomeTemplate.findMany({
      where: { agentId, ...(kind === 'GROUP' || kind === 'PRIVATE' ? { kind } : {}) },
      orderBy: { createdAt: 'desc' },
      select: WELCOME_SELECT,
    })
    return NextResponse.json({ ok: true, data })
  } catch (err) {
    console.error('[diamond-assistant/welcome-templates GET]', err)
    return NextResponse.json(
      { ok: false, error: 'No se pudieron cargar las plantillas de bienvenida.' },
      { status: 500 },
    )
  }
}

const createSchema = z.object({
  agentId: z.string().trim().min(1, 'Falta el agente.'),
  name: z.string().trim().min(1, 'El nombre es obligatorio.'),
  body: z.string().trim().min(1, 'El cuerpo del mensaje es obligatorio.'),
  // Adjunto opcional de la Biblioteca (id de MediaAsset). Legacy: una sola imagen.
  mediaAssetId: z.string().trim().min(1).nullable().optional(),
  // Varias imágenes/recursos adjuntos (ids de MediaAsset).
  mediaAssetIds: z.array(z.string().trim().min(1)).optional(),
  // Tipo: GROUP (al grupo) o PRIVATE (al privado 1:1).
  kind: z.enum(['GROUP', 'PRIVATE']).optional(),
  isActive: z.boolean().optional(),
})

// POST /api/admin/diamond-assistant/welcome-templates — crea una plantilla.
export async function POST(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    const first = parsed.error.errors[0]?.message ?? 'Datos inválidos.'
    return NextResponse.json({ ok: false, error: first }, { status: 400 })
  }

  const { agentId, name, body: messageBody, mediaAssetId, mediaAssetIds, kind, isActive } = parsed.data

  try {
    // Verificamos que el agente exista antes de crear su plantilla.
    const agent = await prisma.assistantAgent.findUnique({
      where: { id: agentId },
      select: { id: true },
    })
    if (!agent) {
      return NextResponse.json({ ok: false, error: 'Agente no encontrado.' }, { status: 404 })
    }

    const data: Prisma.WelcomeTemplateUncheckedCreateInput = {
      agentId,
      name,
      body: messageBody,
    }
    if (mediaAssetId) data.mediaAssetId = mediaAssetId
    if (mediaAssetIds) data.mediaAssetIds = mediaAssetIds
    if (kind) data.kind = kind
    if (isActive !== undefined) data.isActive = isActive

    const created = await prisma.welcomeTemplate.create({ data, select: WELCOME_SELECT })
    return NextResponse.json({ ok: true, data: created }, { status: 201 })
  } catch (err) {
    console.error('[diamond-assistant/welcome-templates POST]', err)
    return NextResponse.json(
      { ok: false, error: 'No se pudo crear la plantilla de bienvenida.' },
      { status: 500 },
    )
  }
}
