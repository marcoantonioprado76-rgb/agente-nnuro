/**
 * Diamond Assistant — API: /connection (FASE 5, funcional)
 * Estado de la sesión de WhatsApp (Baileys) por agente y control del flujo QR.
 *
 *   GET    ?agentId=  -> estado actual { status, qrBase64?, phone? }
 *   POST   { agentId, forceFresh? } -> inicia el flujo QR y devuelve el estado
 *   DELETE { agentId } -> cierra/desvincula la sesión
 *
 * El motor real lo provee '@/lib/diamond-assistant/diamondBaileys' (lo CONSUMIMOS,
 * no lo implementamos aquí).
 */
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import {
  getDiamondStatus,
  connectDiamond,
  disconnectDiamond,
} from '@/lib/diamond-assistant/diamondBaileys'

/** Verifica que el agente exista; devuelve solo su id. */
async function findAgent(agentId: string) {
  return prisma.assistantAgent.findUnique({
    where: { id: agentId },
    select: { id: true },
  })
}

// GET /api/admin/diamond-assistant/connection?agentId=...
export async function GET(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const agentId = req.nextUrl.searchParams.get('agentId')?.trim()
  if (!agentId) {
    return NextResponse.json({ ok: false, error: 'Falta el parámetro agentId.' }, { status: 400 })
  }

  try {
    const agent = await findAgent(agentId)
    if (!agent) {
      return NextResponse.json({ ok: false, error: 'Agente no encontrado.' }, { status: 404 })
    }

    const status = getDiamondStatus(agentId)
    return NextResponse.json({ ok: true, data: status })
  } catch (err) {
    console.error('[diamond-assistant/connection GET]', err)
    return NextResponse.json(
      { ok: false, error: 'No se pudo obtener el estado de la conexión.' },
      { status: 500 },
    )
  }
}

const connectSchema = z.object({
  agentId: z.string().trim().min(1, 'Falta el agentId.'),
  forceFresh: z.boolean().optional(),
})

// POST /api/admin/diamond-assistant/connection — inicia el flujo QR.
export async function POST(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const body = await req.json().catch(() => null)
  const parsed = connectSchema.safeParse(body)
  if (!parsed.success) {
    const first = parsed.error.errors[0]?.message ?? 'Datos inválidos.'
    return NextResponse.json({ ok: false, error: first }, { status: 400 })
  }

  const { agentId, forceFresh } = parsed.data

  try {
    const agent = await findAgent(agentId)
    if (!agent) {
      return NextResponse.json({ ok: false, error: 'Agente no encontrado.' }, { status: 404 })
    }

    await connectDiamond(agentId, { forceFresh })
    const status = getDiamondStatus(agentId)
    return NextResponse.json({ ok: true, data: status })
  } catch (err) {
    console.error('[diamond-assistant/connection POST]', err)
    return NextResponse.json(
      { ok: false, error: 'No se pudo iniciar la conexión de WhatsApp.' },
      { status: 500 },
    )
  }
}

const disconnectSchema = z.object({
  agentId: z.string().trim().min(1, 'Falta el agentId.'),
})

// DELETE /api/admin/diamond-assistant/connection — cierra la sesión.
export async function DELETE(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const body = await req.json().catch(() => null)
  const parsed = disconnectSchema.safeParse(body)
  if (!parsed.success) {
    const first = parsed.error.errors[0]?.message ?? 'Datos inválidos.'
    return NextResponse.json({ ok: false, error: first }, { status: 400 })
  }

  const { agentId } = parsed.data

  try {
    const agent = await findAgent(agentId)
    if (!agent) {
      return NextResponse.json({ ok: false, error: 'Agente no encontrado.' }, { status: 404 })
    }

    disconnectDiamond(agentId)
    const status = getDiamondStatus(agentId)
    return NextResponse.json({ ok: true, data: status })
  } catch (err) {
    console.error('[diamond-assistant/connection DELETE]', err)
    return NextResponse.json(
      { ok: false, error: 'No se pudo desconectar WhatsApp.' },
      { status: 500 },
    )
  }
}
