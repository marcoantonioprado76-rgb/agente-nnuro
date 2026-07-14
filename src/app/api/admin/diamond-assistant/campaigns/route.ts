/**
 * Diamond Assistant — API: /campaigns (FASE 4 · Campañas programadas con aprobación)
 *
 *   GET  -> lista de campañas (filtros opcionales: agentId, status).
 *   POST -> crea una campaña. SIEMPRE nace en PENDING_APPROVAL (regla de
 *           seguridad: nada se envía sin aprobación previa del admin).
 *
 * Destino (targetType + targetJson):
 *   - CONTACT  -> { phones:[...] }  o  { contactIds:[...] } (se resuelven a teléfonos)
 *   - SEGMENT  -> { tag?, status? }  (se resuelve contra prisma.contact)
 *   - MANUAL   -> { phones:[...] }
 * `totalTargets` se calcula al crear resolviendo la lista real de destinatarios.
 *
 * Scope: global por ahora → organizationId = null (igual que /contacts).
 * NOTA: el envío real por WhatsApp se cablea en la Fase 5; aquí solo se
 * planifica y aprueba la campaña.
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
} from '@prisma/client'

// ── Constantes de dominio ──────────────────────────────────────────
const TARGET_TYPES = ['CONTACT', 'SEGMENT', 'MANUAL'] as const
type TargetType = (typeof TARGET_TYPES)[number]

const VALID_CONTACT_STATUS = new Set<string>(Object.values(DiamondContactStatus))
const VALID_CAMPAIGN_STATUS = new Set<string>(Object.values(DiamondCampaignStatus))

// ── Helpers ────────────────────────────────────────────────────────

/** No filtra `err.message`; P2025 -> 404, resto -> 500 genérico. */
function fail(err: unknown, tag: string): NextResponse {
  console.error(`[${tag}]`, err)
  const code = (err as { code?: unknown })?.code
  if (code === 'P2025') {
    return NextResponse.json({ ok: false, error: 'Registro no encontrado.' }, { status: 404 })
  }
  return NextResponse.json(
    { ok: false, error: 'Ocurrió un error al procesar la solicitud.' },
    { status: 500 },
  )
}

const uniqStrings = (arr: unknown[]): string[] =>
  Array.from(new Set(arr.map((v) => String(v).trim()).filter(Boolean)))

/**
 * Resuelve la lista real de teléfonos destinatarios de una campaña según su
 * targetType/targetJson. Se usa tanto para calcular `totalTargets` al crear
 * como para el envío (Fase 5). Devuelve teléfonos únicos y normalizados.
 */
async function resolveRecipients(
  targetType: string,
  targetJson: unknown,
): Promise<string[]> {
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

/** Adjunta título/tipo del media adjunto (no hay FK, se resuelve aparte). */
async function attachMedia<T extends { mediaAssetId: string | null }>(
  rows: T[],
): Promise<(T & { mediaTitle: string | null; mediaType: DiamondMediaType | null })[]> {
  const ids = Array.from(new Set(rows.map((r) => r.mediaAssetId).filter((x): x is string => !!x)))
  const map = new Map<string, { title: string; type: DiamondMediaType }>()
  if (ids.length > 0) {
    const media = await prisma.mediaAsset.findMany({
      where: { id: { in: ids } },
      select: { id: true, title: true, type: true },
    })
    for (const m of media) map.set(m.id, { title: m.title, type: m.type })
  }
  return rows.map((r) => ({
    ...r,
    mediaTitle: r.mediaAssetId ? (map.get(r.mediaAssetId)?.title ?? null) : null,
    mediaType: r.mediaAssetId ? (map.get(r.mediaAssetId)?.type ?? null) : null,
  }))
}

// ── GET: listar campañas (filtros opcionales agentId/status) ───────
export async function GET(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  try {
    const agentId = req.nextUrl.searchParams.get('agentId')?.trim()
    const statusParam = req.nextUrl.searchParams.get('status')?.trim()

    const where: Prisma.AssistantCampaignWhereInput = {}
    if (agentId) where.agentId = agentId
    if (statusParam && VALID_CAMPAIGN_STATUS.has(statusParam)) {
      where.status = statusParam as DiamondCampaignStatus
    }

    const rows = await prisma.assistantCampaign.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { agent: { select: { name: true } } },
    })

    const data = await attachMedia(rows)
    return NextResponse.json({ ok: true, data })
  } catch (err) {
    return fail(err, 'campaigns GET')
  }
}

// ── Validación de creación ─────────────────────────────────────────
const createSchema = z.object({
  agentId: z.string().trim().min(1, 'El agente es obligatorio.'),
  name: z.string().trim().min(1, 'El nombre es obligatorio.'),
  messageBody: z.string().trim().min(1, 'El mensaje es obligatorio.'),
  targetType: z.enum(TARGET_TYPES),
  targetJson: z.record(z.any()).optional(),
  mediaAssetId: z.string().trim().min(1).nullable().optional(),
  scheduledAt: z.string().trim().min(1).nullable().optional(),
  recurring: z.boolean().optional(),
  recurrenceJson: z.record(z.any()).nullable().optional(),
  throttleMs: z.coerce.number().int().min(0).max(60_000).optional(),
  // Enviar por PLANTILLA aprobada (para fuera de 24h): { name, language, params }.
  templateJson: z.record(z.any()).nullable().optional(),
})

/** Valida que el targetJson tenga sentido según el targetType. */
function validateTarget(
  targetType: TargetType,
  tj: Record<string, unknown> | undefined,
): string | null {
  const obj = tj ?? {}
  if (targetType === 'MANUAL') {
    const phones = Array.isArray(obj.phones) ? uniqStrings(obj.phones) : []
    if (phones.length === 0) return 'Pega al menos un número de teléfono.'
    return null
  }
  if (targetType === 'CONTACT') {
    const phones = Array.isArray(obj.phones) ? obj.phones : []
    const contactIds = Array.isArray(obj.contactIds) ? obj.contactIds : []
    if (phones.length === 0 && contactIds.length === 0) {
      return 'Selecciona al menos un contacto.'
    }
    return null
  }
  // SEGMENT: al menos tag o status.
  const tag = typeof obj.tag === 'string' ? obj.tag.trim() : ''
  const status = typeof obj.status === 'string' ? obj.status.trim() : ''
  if (!tag && !status) return 'Indica una etiqueta o un estado para el segmento.'
  return null
}

// ── POST: crear campaña (siempre PENDING_APPROVAL) ─────────────────
export async function POST(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    const first = parsed.error.errors[0]?.message ?? 'Datos inválidos.'
    return NextResponse.json({ ok: false, error: first }, { status: 400 })
  }

  const {
    agentId,
    name,
    messageBody,
    targetType,
    targetJson,
    mediaAssetId,
    scheduledAt,
    recurring,
    recurrenceJson,
    throttleMs,
    templateJson,
  } = parsed.data

  const targetError = validateTarget(targetType, targetJson)
  if (targetError) {
    return NextResponse.json({ ok: false, error: targetError }, { status: 400 })
  }

  // scheduledAt (opcional) → Date válida.
  let scheduledDate: Date | null = null
  if (scheduledAt) {
    const d = new Date(scheduledAt)
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json(
        { ok: false, error: 'La fecha programada no es válida.' },
        { status: 400 },
      )
    }
    scheduledDate = d
  }

  try {
    // El agente debe existir (además de dar la FK).
    const agent = await prisma.assistantAgent.findUnique({
      where: { id: agentId },
      select: { id: true },
    })
    if (!agent) {
      return NextResponse.json({ ok: false, error: 'El agente indicado no existe.' }, { status: 400 })
    }

    // El media adjunto (si viene) debe existir.
    if (mediaAssetId) {
      const media = await prisma.mediaAsset.findUnique({
        where: { id: mediaAssetId },
        select: { id: true },
      })
      if (!media) {
        return NextResponse.json({ ok: false, error: 'El recurso adjunto no existe.' }, { status: 400 })
      }
    }

    // Calcula la lista real de destinatarios → totalTargets.
    const recipients = await resolveRecipients(targetType, targetJson ?? {})

    const created = await prisma.assistantCampaign.create({
      data: {
        agentId,
        organizationId: null,
        createdBy: (admin as { id?: string }).id ?? null,
        name,
        messageBody,
        mediaAssetId: mediaAssetId ?? null,
        targetType,
        targetJson: (targetJson ?? {}) as Prisma.InputJsonValue,
        status: DiamondCampaignStatus.PENDING_APPROVAL,
        scheduledAt: scheduledDate,
        recurring: recurring ?? false,
        recurrenceJson:
          recurrenceJson == null
            ? Prisma.JsonNull
            : (recurrenceJson as Prisma.InputJsonValue),
        templateJson:
          templateJson == null
            ? Prisma.JsonNull
            : (templateJson as Prisma.InputJsonValue),
        throttleMs: throttleMs ?? 1000,
        totalTargets: recipients.length,
      },
      include: { agent: { select: { name: true } } },
    })

    const [withMedia] = await attachMedia([created])
    return NextResponse.json({ ok: true, data: withMedia }, { status: 201 })
  } catch (err) {
    return fail(err, 'campaigns POST')
  }
}
