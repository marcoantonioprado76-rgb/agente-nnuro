/**
 * Diamond Assistant — API: /dashboard (FASE 4 · métricas reales)
 *   GET -> métricas del panel calculadas con count / groupBy de Prisma:
 *          agentes (total + activos), grupos, contactos (total + opt-in),
 *          campañas (total + desglose por estado), mensajes enviados,
 *          errores de entrega y los últimos ~8 registros del log.
 *
 * Scope: global (sin filtrar por organización) para reflejar todo el centro.
 * Devuelve { ok, data }.
 */
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { DiamondMsgStatus, DiamondCampaignStatus } from '@prisma/client'

const RECENT_LIMIT = 8

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

export async function GET() {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  try {
    const [
      totalAgents,
      activeAgents,
      totalGroups,
      totalContacts,
      optInContacts,
      totalCampaigns,
      campaignsByStatus,
      messagesSent,
      errors,
      recent,
    ] = await Promise.all([
      prisma.assistantAgent.count(),
      prisma.assistantAgent.count({ where: { isActive: true } }),
      prisma.assistantGroup.count(),
      prisma.contact.count(),
      prisma.contact.count({ where: { optIn: true } }),
      prisma.assistantCampaign.count(),
      prisma.assistantCampaign.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      prisma.assistantMessageLog.count({
        where: {
          direction: 'OUT',
          status: { in: [DiamondMsgStatus.SENT, DiamondMsgStatus.DELIVERED] },
        },
      }),
      prisma.assistantMessageLog.count({
        where: { status: { in: [DiamondMsgStatus.FAILED, DiamondMsgStatus.ERROR] } },
      }),
      prisma.assistantMessageLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: RECENT_LIMIT,
      }),
    ])

    // Desglose por estado con todas las claves inicializadas en 0.
    const byStatus = Object.fromEntries(
      Object.values(DiamondCampaignStatus).map((s) => [s, 0] as const),
    ) as Record<DiamondCampaignStatus, number>
    for (const row of campaignsByStatus) {
      byStatus[row.status] = row._count._all
    }

    const data = {
      agents: { total: totalAgents, active: activeAgents },
      groups: { total: totalGroups },
      contacts: { total: totalContacts, optIn: optInContacts },
      campaigns: { total: totalCampaigns, byStatus },
      messagesSent,
      errors,
      recent: recent.map(serializeLog),
    }

    return NextResponse.json({ ok: true, data })
  } catch (err) {
    console.error('[DA DASHBOARD] GET error:', err)
    return NextResponse.json(
      { ok: false, error: 'No se pudieron cargar las métricas.' },
      { status: 500 },
    )
  }
}
