/**
 * Diamond Assistant — API: /agents (FASE 1, funcional)
 * GET  -> lista de agentes IA (sin exponer la key cifrada).
 * POST -> crea un agente con su personalidad, modelo, proveedor y temperatura.
 */
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { randomBytes } from 'crypto'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { encrypt } from '@/lib/crypto'

// Proveedores válidos (paridad con el enum Prisma DiamondProvider).
const PROVIDERS = ['BAILEYS', 'YCLOUD', 'META'] as const

// Selección segura: nunca traemos la key en claro; `openaiKeyEnc` solo para
// derivar el booleano `hasOpenaiKey`.
const AGENT_SELECT = {
  id: true,
  name: true,
  avatarUrl: true,
  personalityPrompt: true,
  model: true,
  temperature: true,
  provider: true,
  providerSender: true,
  timezone: true,
  isActive: true,
  voiceEnabled: true,
  voiceMode: true,
  voiceId: true,
  openaiKeyEnc: true,
  providerApiKeyEnc: true,
  webhookToken: true,
  createdAt: true,
  updatedAt: true,
} as const

type AgentRow = {
  openaiKeyEnc: string | null
  providerApiKeyEnc: string | null
} & Record<string, unknown>

/** Genera un token de webhook aleatorio (hex). Se usa en el `?token=` del webhook. */
function newWebhookToken(): string {
  return randomBytes(24).toString('hex')
}

/**
 * Quita las keys cifradas (OpenAI y proveedor) y añade los booleanos
 * `hasOpenaiKey` / `hasProviderKey`. `webhookToken` SÍ se expone (panel admin).
 */
function toSafeAgent({ openaiKeyEnc, providerApiKeyEnc, ...rest }: AgentRow) {
  return { ...rest, hasOpenaiKey: !!openaiKeyEnc, hasProviderKey: !!providerApiKeyEnc }
}

// GET /api/admin/diamond-assistant/agents — lista de agentes (más nuevos primero).
export async function GET() {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  try {
    const agents = await prisma.assistantAgent.findMany({
      orderBy: { createdAt: 'desc' },
      select: AGENT_SELECT,
    })

    // Backfill perezoso: los agentes creados antes de esta función no tienen
    // webhookToken. Se genera y persiste uno la primera vez que se listan.
    const withToken = await Promise.all(
      agents.map(async (a) => {
        if (a.webhookToken) return a
        const token = newWebhookToken()
        try {
          await prisma.assistantAgent.update({
            where: { id: a.id },
            data: { webhookToken: token },
          })
        } catch (err) {
          console.error('[diamond-assistant/agents GET] backfill webhookToken', err)
        }
        return { ...a, webhookToken: token }
      }),
    )

    return NextResponse.json({ ok: true, data: withToken.map(toSafeAgent) })
  } catch (err) {
    console.error('[diamond-assistant/agents GET]', err)
    return NextResponse.json(
      { ok: false, error: 'No se pudieron cargar los agentes.' },
      { status: 500 },
    )
  }
}

const createSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio.'),
  personalityPrompt: z.string().trim().min(1, 'La personalidad es obligatoria.'),
  model: z.string().trim().min(1).optional(),
  provider: z.enum(PROVIDERS).optional(),
  temperature: z.coerce.number().min(0).max(1).optional(),
  timezone: z.string().trim().min(1).optional(),
  isActive: z.boolean().optional(),
  // Key en claro desde el form; se cifra antes de persistir. Opcional.
  openaiKey: z.string().optional(),
  // Token del proveedor (YCloud/Meta) en claro; se cifra antes de persistir.
  providerApiKey: z.string().optional(),
  // Número / Phone Number ID de WhatsApp del proveedor. Texto plano.
  providerSender: z.string().optional(),
  // Voz: responder con nota de voz + modo + voz elegida.
  voiceEnabled: z.boolean().optional(),
  voiceMode: z.enum(['off', 'audio_in', 'always']).optional(),
  voiceId: z.string().trim().nullable().optional(),
})

// POST /api/admin/diamond-assistant/agents — crea un agente.
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
    name,
    personalityPrompt,
    model,
    provider,
    temperature,
    timezone,
    isActive,
    openaiKey,
    providerApiKey,
    providerSender,
    voiceEnabled,
    voiceMode,
    voiceId,
  } = parsed.data

  try {
    const data: Prisma.AssistantAgentUncheckedCreateInput = {
      name,
      personalityPrompt,
      createdBy: admin.id,
      // Token del webhook entrante (YCloud/Meta) generado al crear el agente.
      webhookToken: newWebhookToken(),
    }
    if (model) data.model = model
    if (provider) data.provider = provider
    if (temperature !== undefined) data.temperature = temperature
    if (timezone) data.timezone = timezone
    if (isActive !== undefined) data.isActive = isActive
    if (voiceEnabled !== undefined) data.voiceEnabled = voiceEnabled
    if (voiceMode) data.voiceMode = voiceMode
    if (voiceId !== undefined) data.voiceId = voiceId?.trim() || null
    // Blindaje: si la voz queda ACTIVADA, el modo no puede ser 'off' (no hablaría).
    if (data.voiceEnabled === true && (!data.voiceMode || data.voiceMode === 'off')) {
      data.voiceMode = 'audio_in'
    }

    const trimmedKey = (openaiKey ?? '').trim()
    if (trimmedKey) data.openaiKeyEnc = encrypt(trimmedKey)

    // Credenciales del proveedor (YCloud/Meta): token cifrado + sender en claro.
    const trimmedProviderKey = (providerApiKey ?? '').trim()
    if (trimmedProviderKey) data.providerApiKeyEnc = encrypt(trimmedProviderKey)

    const trimmedSender = (providerSender ?? '').trim()
    if (trimmedSender) data.providerSender = trimmedSender

    const created = await prisma.assistantAgent.create({ data, select: AGENT_SELECT })
    return NextResponse.json({ ok: true, data: toSafeAgent(created) }, { status: 201 })
  } catch (err) {
    console.error('[diamond-assistant/agents POST]', err)
    return NextResponse.json(
      { ok: false, error: 'No se pudo crear el agente.' },
      { status: 500 },
    )
  }
}
