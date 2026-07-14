/**
 * Diamond Assistant — API: /campaigns/[id] (FASE 4 · Campañas con aprobación)
 *
 *   GET    -> detalle de una campaña (con nombre de agente y media adjunto).
 *   PATCH  -> editar (solo en DRAFT o PENDING_APPROVAL). Recalcula totalTargets
 *             si cambia el destino.
 *   DELETE -> eliminar la campaña.
 *   POST   -> acciones:
 *             { action: 'approve' } -> aprueba (status → SCHEDULED, guarda
 *                                       approvedBy + approvedAt).
 *             { action: 'run' }     -> ejecuta el ENVÍO SIMULADO: resuelve la
 *                                       lista, llama al stub sendMediaAsset por
 *                                       cada destinatario (respetando throttleMs)
 *                                       y registra cada envío en el Historial
 *                                       (assistantMessageLog). El envío real por
 *                                       WhatsApp se cablea en la Fase 5; por
 *                                       ahora TODO queda como registro histórico.
 *
 * El enum DiamondCampaignStatus no tiene un valor "APPROVED"; una campaña
 * aprobada = status SCHEDULED con approvedAt/approvedBy establecidos.
 */
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import {
  Prisma,
  DiamondCampaignStatus,
  DiamondContactStatus,
  DiamondMediaType,
  DiamondMsgStatus,
} from '@prisma/client'
import type { AssistantCampaign as CampaignRecord } from '@prisma/client'
import { executeCampaignById } from '@/lib/diamond-assistant/campaignSender'

// ── Constantes ─────────────────────────────────────────────────────
const TARGET_TYPES = ['CONTACT', 'SEGMENT', 'MANUAL'] as const
type TargetType = (typeof TARGET_TYPES)[number]

const VALID_CONTACT_STATUS = new Set<string>(Object.values(DiamondContactStatus))

/** Estados en los que la campaña aún es editable. */
const EDITABLE_STATUS: DiamondCampaignStatus[] = [
  DiamondCampaignStatus.DRAFT,
  DiamondCampaignStatus.PENDING_APPROVAL,
  DiamondCampaignStatus.SCHEDULED, // aprobada pero AÚN NO enviada → se puede editar
]

// ── Helpers ────────────────────────────────────────────────────────
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

const uniqStrings = (arr: unknown[]): string[] =>
  Array.from(new Set(arr.map((v) => String(v).trim()).filter(Boolean)))

/** No filtra `err.message`; P2025 -> 404, resto -> 500 genérico. */
function fail(err: unknown, tag: string): NextResponse {
  console.error(`[${tag}]`, err)
  const code = (err as { code?: unknown })?.code
  if (code === 'P2025') {
    return NextResponse.json({ ok: false, error: 'Campaña no encontrada.' }, { status: 404 })
  }
  return NextResponse.json(
    { ok: false, error: 'Ocurrió un error al procesar la solicitud.' },
    { status: 500 },
  )
}

/**
 * Resuelve la lista real de teléfonos destinatarios según targetType/targetJson.
 * (Misma lógica que en /campaigns/route.ts; se mantiene local para no acoplar
 * archivos de rutas entre sí.)
 */
async function resolveRecipients(targetType: string, targetJson: unknown): Promise<string[]> {
  const tj = (targetJson ?? {}) as Record<string, unknown>

  if (targetType === 'MANUAL') {
    return Array.isArray(tj.phones) ? uniqStrings(tj.phones) : []
  }

  if (targetType === 'CONTACT') {
    const phones = Array.isArray(tj.phones) ? tj.phones.map(String) : []
    const contactIds = Array.isArray(tj.contactIds) ? uniqStrings(tj.contactIds) : []
    const resolved: string[] = [...phones]
    if (contactIds.length > 0) {
      const rows = await prisma.contact.findMany({
        where: { id: { in: contactIds } },
        select: { phone: true },
      })
      resolved.push(...rows.map((r) => r.phone))
    }
    return uniqStrings(resolved)
  }

  if (targetType === 'SEGMENT') {
    const where: Prisma.ContactWhereInput = { organizationId: null }
    const tag = typeof tj.tag === 'string' ? tj.tag.trim() : ''
    const status = typeof tj.status === 'string' ? tj.status.trim() : ''
    if (tag) where.tag = tag
    if (status && VALID_CONTACT_STATUS.has(status)) {
      where.status = status as DiamondContactStatus
    }
    const rows = await prisma.contact.findMany({ where, select: { phone: true } })
    return uniqStrings(rows.map((r) => r.phone))
  }

  return []
}

/** Adjunta título/tipo del media adjunto (sin FK, se resuelve aparte). */
async function withMedia<T extends { mediaAssetId: string | null }>(row: T) {
  if (!row.mediaAssetId) return { ...row, mediaTitle: null, mediaType: null }
  const media = await prisma.mediaAsset.findUnique({
    where: { id: row.mediaAssetId },
    select: { title: true, type: true },
  })
  return {
    ...row,
    mediaTitle: media?.title ?? null,
    mediaType: media?.type ?? null,
  }
}

// ── GET: detalle ───────────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  try {
    const row = await prisma.assistantCampaign.findUnique({
      where: { id: params.id },
      include: { agent: { select: { name: true } } },
    })
    if (!row) {
      return NextResponse.json({ ok: false, error: 'Campaña no encontrada.' }, { status: 404 })
    }
    return NextResponse.json({ ok: true, data: await withMedia(row) })
  } catch (err) {
    return fail(err, 'campaigns/:id GET')
  }
}

// ── PATCH: editar (solo DRAFT / PENDING_APPROVAL) ──────────────────
const patchSchema = z.object({
  name: z.string().trim().min(1, 'El nombre no puede estar vacío.').optional(),
  messageBody: z.string().trim().min(1, 'El mensaje no puede estar vacío.').optional(),
  // mediaAssetId: undefined = no tocar; null = quitar; string = asignar.
  mediaAssetId: z.string().trim().min(1).nullable().optional(),
  targetType: z.enum(TARGET_TYPES).optional(),
  targetJson: z.record(z.any()).optional(),
  scheduledAt: z.string().trim().min(1).nullable().optional(),
  recurring: z.boolean().optional(),
  recurrenceJson: z.record(z.any()).nullable().optional(),
  throttleMs: z.coerce.number().int().min(0).max(60_000).optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const body = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    const first = parsed.error.errors[0]?.message ?? 'Datos inválidos.'
    return NextResponse.json({ ok: false, error: first }, { status: 400 })
  }

  const p = parsed.data

  try {
    const current = await prisma.assistantCampaign.findUnique({
      where: { id: params.id },
      select: { id: true, status: true, targetType: true, targetJson: true },
    })
    if (!current) {
      return NextResponse.json({ ok: false, error: 'Campaña no encontrada.' }, { status: 404 })
    }
    if (!EDITABLE_STATUS.includes(current.status)) {
      return NextResponse.json(
        { ok: false, error: 'Solo se pueden editar campañas que todavía no se enviaron (borrador, pendientes o programadas).' },
        { status: 409 },
      )
    }

    const data: Prisma.AssistantCampaignUpdateInput = {}
    if (p.name !== undefined) data.name = p.name
    if (p.messageBody !== undefined) data.messageBody = p.messageBody
    if (p.mediaAssetId !== undefined) data.mediaAssetId = p.mediaAssetId
    if (p.recurring !== undefined) data.recurring = p.recurring
    if (p.throttleMs !== undefined) data.throttleMs = p.throttleMs

    if (p.scheduledAt !== undefined) {
      if (p.scheduledAt === null) {
        data.scheduledAt = null
      } else {
        const d = new Date(p.scheduledAt)
        if (Number.isNaN(d.getTime())) {
          return NextResponse.json(
            { ok: false, error: 'La fecha programada no es válida.' },
            { status: 400 },
          )
        }
        data.scheduledAt = d
      }
    }

    if (p.recurrenceJson !== undefined) {
      data.recurrenceJson =
        p.recurrenceJson === null ? Prisma.JsonNull : (p.recurrenceJson as Prisma.InputJsonValue)
    }

    // Validar media si se asigna uno nuevo.
    if (p.mediaAssetId) {
      const media = await prisma.mediaAsset.findUnique({
        where: { id: p.mediaAssetId },
        select: { id: true },
      })
      if (!media) {
        return NextResponse.json({ ok: false, error: 'El recurso adjunto no existe.' }, { status: 400 })
      }
    }

    // Si cambia el destino, recalcular totalTargets.
    const nextTargetType = p.targetType ?? (current.targetType as TargetType)
    const targetChanged = p.targetType !== undefined || p.targetJson !== undefined
    if (p.targetType !== undefined) data.targetType = p.targetType
    if (p.targetJson !== undefined) data.targetJson = p.targetJson as Prisma.InputJsonValue

    if (targetChanged) {
      const nextTargetJson = p.targetJson ?? current.targetJson
      const recipients = await resolveRecipients(nextTargetType, nextTargetJson)
      data.totalTargets = recipients.length
    }

    const updated = await prisma.assistantCampaign.update({
      where: { id: params.id },
      data,
      include: { agent: { select: { name: true } } },
    })
    return NextResponse.json({ ok: true, data: await withMedia(updated) })
  } catch (err) {
    return fail(err, 'campaigns/:id PATCH')
  }
}

// ── DELETE ─────────────────────────────────────────────────────────
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  try {
    const existing = await prisma.assistantCampaign.findUnique({
      where: { id: params.id },
      select: { id: true },
    })
    if (!existing) {
      return NextResponse.json({ ok: false, error: 'Campaña no encontrada.' }, { status: 404 })
    }
    await prisma.assistantCampaign.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return fail(err, 'campaigns/:id DELETE')
  }
}

// ── POST: acciones approve / run ───────────────────────────────────
const actionSchema = z.object({
  action: z.enum(['approve', 'run']),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const body = await req.json().catch(() => null)
  const parsed = actionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Acción no válida.' }, { status: 400 })
  }

  const adminId = (admin as { id?: string }).id ?? null

  try {
    const campaign = await prisma.assistantCampaign.findUnique({ where: { id: params.id } })
    if (!campaign) {
      return NextResponse.json({ ok: false, error: 'Campaña no encontrada.' }, { status: 404 })
    }

    if (parsed.data.action === 'approve') {
      return await approveCampaign(campaign, adminId)
    }
    return await runCampaign(campaign)
  } catch (err) {
    return fail(err, 'campaigns/:id POST')
  }
}

// ── Acción: aprobar ────────────────────────────────────────────────
async function approveCampaign(
  campaign: CampaignRecord,
  adminId: string | null,
): Promise<NextResponse> {
  // Solo tiene sentido aprobar algo que está esperando aprobación (o un borrador).
  if (
    campaign.status !== DiamondCampaignStatus.PENDING_APPROVAL &&
    campaign.status !== DiamondCampaignStatus.DRAFT
  ) {
    return NextResponse.json(
      { ok: false, error: 'Solo se pueden aprobar campañas pendientes o en borrador.' },
      { status: 409 },
    )
  }

  const updated = await prisma.assistantCampaign.update({
    where: { id: campaign.id },
    data: {
      status: DiamondCampaignStatus.SCHEDULED,
      approvedBy: adminId,
      approvedAt: new Date(),
    },
    include: { agent: { select: { name: true } } },
  })
  return NextResponse.json({ ok: true, data: await withMedia(updated) })
}

// ── Acción: ejecutar (ENVÍO SIMULADO — queda en el Historial) ──────
async function runCampaign(
  campaign: CampaignRecord,
): Promise<NextResponse> {
  // Solo si está aprobada: status SCHEDULED + approvedAt establecido.
  const isApproved =
    campaign.status === DiamondCampaignStatus.SCHEDULED && campaign.approvedAt !== null
  if (!isApproved) {
    return NextResponse.json(
      { ok: false, error: 'La campaña debe estar aprobada antes de ejecutarse.' },
      { status: 409 },
    )
  }

  // ENVÍO REAL por el canal del agente (texto + adjunto), con registro en Historial
  // y manejo de recurrencia. Toda la lógica vive en campaignSender.executeCampaignById.
  const summary = await executeCampaignById(campaign.id)
  if (!summary.ok) {
    return NextResponse.json(
      { ok: false, error: summary.error ?? 'No se pudo ejecutar la campaña.' },
      { status: 400 },
    )
  }

  const updated = await prisma.assistantCampaign.findUnique({
    where: { id: campaign.id },
    include: { agent: { select: { name: true } } },
  })

  return NextResponse.json({
    ok: true,
    data: updated ? await withMedia(updated) : null,
    summary: { total: summary.total, sent: summary.sent, failed: summary.failed },
  })
}
