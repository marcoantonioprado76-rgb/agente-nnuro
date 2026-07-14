/**
 * Diamond Assistant — API: /rules (FASE 2, funcional)
 * Reglas de seguridad del agente (no prometer curas/ganancias, no spam,
 * respetar horarios, derivar a Marco, aprobar envíos masivos).
 *
 * GET  ?agentId=... -> lista las reglas de ese agente.
 * POST -> crea una regla, o (con { preset: true }) carga el set recomendado.
 */
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// Paridad con el enum Prisma DiamondRuleType.
const RULE_TYPES = ['FORBID', 'ESCALATE', 'REQUIRE_APPROVAL'] as const
type RuleType = (typeof RULE_TYPES)[number]

// Solo exponemos lo necesario al cliente.
const RULE_SELECT = {
  id: true,
  agentId: true,
  description: true,
  type: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const

// Set de reglas de seguridad recomendadas (modo "cargar recomendadas").
const PRESET_RULES: { type: RuleType; description: string }[] = [
  { type: 'FORBID', description: 'No prometer curas ni resultados médicos.' },
  { type: 'FORBID', description: 'No prometer ganancias económicas ni ingresos garantizados.' },
  { type: 'FORBID', description: 'No enviar spam ni mensajes fuera de los horarios permitidos.' },
  { type: 'ESCALATE', description: 'Derivar a Marco los casos importantes, quejas o decisiones sensibles.' },
  { type: 'REQUIRE_APPROVAL', description: 'Pedir aprobación del admin antes de cualquier envío masivo.' },
]

// GET /api/admin/diamond-assistant/rules?agentId=... — reglas del agente.
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
    const rules = await prisma.safetyRule.findMany({
      where: { agentId },
      orderBy: { createdAt: 'desc' },
      select: RULE_SELECT,
    })
    return NextResponse.json({ ok: true, data: rules })
  } catch (err) {
    console.error('[diamond-assistant/rules GET]', err)
    return NextResponse.json(
      { ok: false, error: 'No se pudieron cargar las reglas.' },
      { status: 500 },
    )
  }
}

const createSchema = z.object({
  agentId: z.string().trim().min(1, 'El agente es obligatorio.'),
  description: z.string().trim().min(1, 'La descripción es obligatoria.'),
  type: z.enum(RULE_TYPES).optional(),
  isActive: z.boolean().optional(),
})

const presetSchema = z.object({
  agentId: z.string().trim().min(1, 'El agente es obligatorio.'),
  preset: z.literal(true),
})

// POST /api/admin/diamond-assistant/rules
//  - { agentId, preset: true }              -> carga el set recomendado.
//  - { agentId, description, type?, isActive? } -> crea una regla.
export async function POST(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const body = await req.json().catch(() => null)

  // ── Modo "cargar reglas recomendadas" ──────────────────────────────
  if (body && typeof body === 'object' && (body as Record<string, unknown>).preset === true) {
    const parsed = presetSchema.safeParse(body)
    if (!parsed.success) {
      const first = parsed.error.errors[0]?.message ?? 'Datos inválidos.'
      return NextResponse.json({ ok: false, error: first }, { status: 400 })
    }
    const { agentId } = parsed.data

    try {
      // Evitamos duplicar reglas que ya existan (comparando por descripción).
      const existing = await prisma.safetyRule.findMany({
        where: { agentId },
        select: { description: true },
      })
      const existingDescriptions = new Set(existing.map((r) => r.description))
      const toCreate = PRESET_RULES.filter((r) => !existingDescriptions.has(r.description))

      if (toCreate.length > 0) {
        await prisma.safetyRule.createMany({
          data: toCreate.map((r) => ({ agentId, description: r.description, type: r.type })),
        })
      }

      const rules = await prisma.safetyRule.findMany({
        where: { agentId },
        orderBy: { createdAt: 'desc' },
        select: RULE_SELECT,
      })
      return NextResponse.json({ ok: true, data: rules, created: toCreate.length }, { status: 201 })
    } catch (err) {
      console.error('[diamond-assistant/rules POST preset]', err)
      return NextResponse.json(
        { ok: false, error: 'No se pudieron cargar las reglas recomendadas.' },
        { status: 500 },
      )
    }
  }

  // ── Modo "crear una regla" ─────────────────────────────────────────
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    const first = parsed.error.errors[0]?.message ?? 'Datos inválidos.'
    return NextResponse.json({ ok: false, error: first }, { status: 400 })
  }

  const { agentId, description, type, isActive } = parsed.data

  try {
    const data: Prisma.SafetyRuleUncheckedCreateInput = { agentId, description }
    if (type) data.type = type
    if (isActive !== undefined) data.isActive = isActive

    const created = await prisma.safetyRule.create({ data, select: RULE_SELECT })
    return NextResponse.json({ ok: true, data: created }, { status: 201 })
  } catch (err) {
    console.error('[diamond-assistant/rules POST]', err)
    return NextResponse.json(
      { ok: false, error: 'No se pudo crear la regla.' },
      { status: 500 },
    )
  }
}
