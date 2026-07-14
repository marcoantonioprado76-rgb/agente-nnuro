/**
 * Diamond Assistant — API: /agents/[id]/chat (FASE 3, Playground)
 *
 * POST -> ejecuta UN turno del agente IA en el Playground (sin WhatsApp).
 *
 * Flujo:
 *   1) Guard admin.
 *   2) Body: { message, history:[{role:'user'|'bot', content}] }.
 *   3) Carga de la base: agente + conocimiento activo + reglas activas +
 *      biblioteca (media, scope global). 404 si el agente no existe.
 *   4) Descifra la OpenAI key del agente (misma función `decrypt` del repo con
 *      la que se cifró en /agents). Si no hay key -> 400 amable.
 *   5) Llama a `runAgentTurn(...)` del motor y devuelve el AgentTurnResult.
 *
 * La key nunca sale del servidor: solo se descifra aquí para pasarla al motor.
 */
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/crypto'
import { runAgentTurn, type AgentTurnInput } from '@/lib/diamond-assistant/agentEngine'

const bodySchema = z.object({
  message: z.string().trim().min(1, 'Escribe un mensaje.'),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'bot']),
        content: z.string(),
      }),
    )
    .optional()
    .default([]),
})

const NO_KEY_MESSAGE =
  'Configurá la API key de OpenAI del agente para probarlo en el Playground.'

// POST /api/admin/diamond-assistant/agents/[id]/chat
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const raw = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    const first = parsed.error.errors[0]?.message ?? 'Datos inválidos.'
    return NextResponse.json({ ok: false, error: first }, { status: 400 })
  }
  const { message, history } = parsed.data

  try {
    // 1) Agente
    const agent = await prisma.assistantAgent.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        personalityPrompt: true,
        model: true,
        temperature: true,
        openaiKeyEnc: true,
      },
    })
    if (!agent) {
      return NextResponse.json({ ok: false, error: 'Agente no encontrado.' }, { status: 404 })
    }

    // 2) Descifrar la OpenAI key del agente. Sin key usable -> 400 amable.
    let openaiKey = ''
    if (agent.openaiKeyEnc) {
      try {
        openaiKey = decrypt(agent.openaiKeyEnc)
      } catch {
        openaiKey = ''
      }
    }
    if (!openaiKey.trim()) {
      return NextResponse.json({ ok: false, error: NO_KEY_MESSAGE }, { status: 400 })
    }

    // 3) Conocimiento activo, reglas activas y biblioteca global (en paralelo).
    const [knowledge, rules, media] = await Promise.all([
      prisma.knowledgeItem.findMany({
        where: { agentId: agent.id, isActive: true },
        select: { title: true, content: true, category: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.safetyRule.findMany({
        where: { agentId: agent.id, isActive: true },
        select: { description: true, type: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.mediaAsset.findMany({
        select: {
          id: true,
          type: true,
          title: true,
          url: true,
          linkUrl: true,
          textContent: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    // 4) Ejecutar un turno del agente contra el motor.
    const input: AgentTurnInput = {
      agent: {
        id: agent.id,
        name: agent.name,
        personalityPrompt: agent.personalityPrompt,
        model: agent.model,
        temperature: agent.temperature,
        openaiKey,
      },
      knowledge,
      rules,
      media,
      history,
      userMessage: message,
    }

    const result = await runAgentTurn(input)
    return NextResponse.json({ ok: true, data: result })
  } catch (err) {
    // No filtramos err.message al cliente (puede contener detalles de OpenAI).
    console.error('[diamond-assistant/agents/:id/chat POST]', err)
    return NextResponse.json(
      { ok: false, error: 'No se pudo generar la respuesta del agente. Inténtalo de nuevo.' },
      { status: 500 },
    )
  }
}
