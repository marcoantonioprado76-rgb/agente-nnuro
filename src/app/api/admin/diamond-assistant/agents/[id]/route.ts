/**
 * Diamond Assistant — API: /agents/[id] (FASE 1, funcional)
 * GET    -> devuelve un agente (sin la key cifrada).
 * PATCH  -> actualiza solo los campos presentes (y cifra la key si viene).
 * DELETE -> elimina el agente (cascade borra grupos/knowledge/reglas/etc.).
 */
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { encrypt } from '@/lib/crypto'

const PROVIDERS = ['BAILEYS', 'YCLOUD', 'META'] as const

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

function toSafeAgent({ openaiKeyEnc, providerApiKeyEnc, ...rest }: AgentRow) {
  return { ...rest, hasOpenaiKey: !!openaiKeyEnc, hasProviderKey: !!providerApiKeyEnc }
}

// GET /api/admin/diamond-assistant/agents/[id]
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  try {
    const agent = await prisma.assistantAgent.findUnique({
      where: { id: params.id },
      select: AGENT_SELECT,
    })
    if (!agent) {
      return NextResponse.json({ ok: false, error: 'Agente no encontrado.' }, { status: 404 })
    }
    return NextResponse.json({ ok: true, data: toSafeAgent(agent) })
  } catch (err) {
    console.error('[diamond-assistant/agents/:id GET]', err)
    return NextResponse.json(
      { ok: false, error: 'No se pudo cargar el agente.' },
      { status: 500 },
    )
  }
}

const patchSchema = z.object({
  name: z.string().trim().min(1, 'El nombre no puede estar vacío.').optional(),
  personalityPrompt: z.string().trim().min(1, 'La personalidad no puede estar vacía.').optional(),
  model: z.string().trim().min(1).optional(),
  provider: z.enum(PROVIDERS).optional(),
  temperature: z.coerce.number().min(0).max(1).optional(),
  timezone: z.string().trim().min(1).optional(),
  isActive: z.boolean().optional(),
  voiceEnabled: z.boolean().optional(),
  voiceMode: z.enum(['off', 'audio_in', 'always']).optional(),
  voiceId: z.string().trim().nullable().optional(),
  // Key en claro: undefined = no tocar; '' = borrar; texto = cifrar y guardar.
  openaiKey: z.string().nullable().optional(),
  // Token del proveedor: undefined = no tocar; '' o null = borrar; texto = cifrar.
  providerApiKey: z.string().nullable().optional(),
  // Sender del proveedor: undefined = no tocar; texto = guardar (vacío = borrar).
  providerSender: z.string().nullable().optional(),
})

// PATCH /api/admin/diamond-assistant/agents/[id]
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const body = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    const first = parsed.error.errors[0]?.message ?? 'Datos inválidos.'
    return NextResponse.json({ ok: false, error: first }, { status: 400 })
  }

  const {
    openaiKey,
    providerApiKey,
    providerSender,
    name,
    personalityPrompt,
    model,
    provider,
    temperature,
    timezone,
    isActive,
    voiceEnabled,
    voiceMode,
    voiceId,
  } = parsed.data

  const data: Prisma.AssistantAgentUpdateInput = {}
  if (name !== undefined) data.name = name
  if (personalityPrompt !== undefined) data.personalityPrompt = personalityPrompt
  if (model !== undefined) data.model = model
  if (provider !== undefined) data.provider = provider
  if (temperature !== undefined) data.temperature = temperature
  if (timezone !== undefined) data.timezone = timezone
  if (isActive !== undefined) data.isActive = isActive
  if (voiceEnabled !== undefined) data.voiceEnabled = voiceEnabled
  if (voiceMode !== undefined) data.voiceMode = voiceMode
  if (voiceId !== undefined) data.voiceId = voiceId?.trim() || null
  // Blindaje: si se activa la voz y el modo quedaría en 'off', lo dejamos en 'audio_in'.
  if (voiceEnabled === true && (voiceMode === undefined || voiceMode === 'off')) {
    data.voiceMode = 'audio_in'
  }

  // Key: undefined = no tocar; vacío/null = borrar; texto = cifrar.
  if (openaiKey !== undefined) {
    const trimmed = (openaiKey ?? '').trim()
    data.openaiKeyEnc = trimmed ? encrypt(trimmed) : null
  }

  // Token del proveedor: undefined = no tocar; vacío/null = borrar; texto = cifrar.
  if (providerApiKey !== undefined) {
    const trimmed = (providerApiKey ?? '').trim()
    data.providerApiKeyEnc = trimmed ? encrypt(trimmed) : null
  }

  // Sender del proveedor: undefined = no tocar; vacío/null = borrar; texto = guardar.
  if (providerSender !== undefined) {
    const trimmed = (providerSender ?? '').trim()
    data.providerSender = trimmed ? trimmed : null
  }

  try {
    const existing = await prisma.assistantAgent.findUnique({
      where: { id: params.id },
      select: { id: true },
    })
    if (!existing) {
      return NextResponse.json({ ok: false, error: 'Agente no encontrado.' }, { status: 404 })
    }

    const updated = await prisma.assistantAgent.update({
      where: { id: params.id },
      data,
      select: AGENT_SELECT,
    })
    return NextResponse.json({ ok: true, data: toSafeAgent(updated) })
  } catch (err) {
    console.error('[diamond-assistant/agents/:id PATCH]', err)
    return NextResponse.json(
      { ok: false, error: 'No se pudo actualizar el agente.' },
      { status: 500 },
    )
  }
}

// DELETE /api/admin/diamond-assistant/agents/[id]
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  try {
    const existing = await prisma.assistantAgent.findUnique({
      where: { id: params.id },
      select: { id: true },
    })
    if (!existing) {
      return NextResponse.json({ ok: false, error: 'Agente no encontrado.' }, { status: 404 })
    }

    await prisma.assistantAgent.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[diamond-assistant/agents/:id DELETE]', err)
    return NextResponse.json(
      { ok: false, error: 'No se pudo eliminar el agente.' },
      { status: 500 },
    )
  }
}
