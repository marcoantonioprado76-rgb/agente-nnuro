/**
 * Diamond Assistant — API: /logs (FASE 4 · historial real)
 *   GET -> lista de mensajes (prisma.assistantMessageLog) con:
 *          filtro opcional por estado (validado), filtro por campaignId
 *          y paginación (page, 25 por página). Orden createdAt desc.
 *
 * Scope: global (sin filtrar por organización). Devuelve { ok, logs, total, pages }.
 */
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { Prisma, DiamondMsgStatus } from '@prisma/client'

const PAGE_SIZE = 25

// Estados válidos (enum del schema) para validar la entrada del cliente.
const VALID_STATUS = new Set<string>(Object.values(DiamondMsgStatus))

/** Forma serializable estable de un registro del log para el cliente. */
function serializeLog(l: {
  id: string
  contactPhone: string
  direction: string
  messageType: string
  content: string | null
  status: DiamondMsgStatus
  error: string | null
  campaignId: string | null
  agentId: string | null
  createdAt: Date
}) {
  return {
    id: l.id,
    contactPhone: l.contactPhone,
    direction: l.direction,
    messageType: l.messageType,
    content: l.content,
    status: l.status,
    error: l.error,
    campaignId: l.campaignId,
    agentId: l.agentId,
    createdAt: l.createdAt,
  }
}

export async function GET(request: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const { searchParams } = new URL(request.url)
  const statusParam = (searchParams.get('status') ?? '').trim()
  const campaignId = (searchParams.get('campaignId') ?? '').trim()
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1') || 1)
  const skip = (page - 1) * PAGE_SIZE

  const where: Prisma.AssistantMessageLogWhereInput = {}
  if (statusParam && VALID_STATUS.has(statusParam)) {
    where.status = statusParam as DiamondMsgStatus
  }
  if (campaignId) where.campaignId = campaignId

  try {
    const [logs, total] = await Promise.all([
      prisma.assistantMessageLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: PAGE_SIZE,
      }),
      prisma.assistantMessageLog.count({ where }),
    ])

    return NextResponse.json({
      ok: true,
      logs: logs.map(serializeLog),
      total,
      pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    })
  } catch (err) {
    console.error('[DA LOGS] GET error:', err)
    return NextResponse.json(
      { ok: false, error: 'No se pudo cargar el historial.' },
      { status: 500 },
    )
  }
}
