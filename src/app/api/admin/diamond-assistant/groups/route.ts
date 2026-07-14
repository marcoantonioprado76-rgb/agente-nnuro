/**
 * Diamond Assistant — API: /groups (FASE 5, funcional)
 *
 *   GET  ?agentId=  -> cruza los grupos REALES de WhatsApp (listDiamondGroups)
 *                      con la config guardada (AssistantGroup) y devuelve la
 *                      lista combinada + las plantillas de bienvenida del agente.
 *                      Si el bot no está conectado -> { connected:false, groups:[] }.
 *   POST { agentId, groupJid, ...config } -> upsert de la config de un grupo
 *                      (único por agentId+groupJid).
 */
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { getDiamondStatus, listDiamondGroups } from '@/lib/diamond-assistant/diamondBaileys'

/** Config persistida de un grupo (lo que devolvemos al cliente). */
const GROUP_SELECT = {
  id: true,
  agentId: true,
  groupJid: true,
  name: true,
  automationEnabled: true,
  aiEnabled: true,
  welcomeEnabled: true,
  welcomeTemplateId: true,
  privateWelcomeEnabled: true,
  allowedHours: true,
  createdAt: true,
  updatedAt: true,
} as const

// GET /api/admin/diamond-assistant/groups?agentId=...
export async function GET(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const agentId = req.nextUrl.searchParams.get('agentId')?.trim()
  if (!agentId) {
    return NextResponse.json({ ok: false, error: 'Falta el parámetro agentId.' }, { status: 400 })
  }

  try {
    const agent = await prisma.assistantAgent.findUnique({
      where: { id: agentId },
      select: { id: true },
    })
    if (!agent) {
      return NextResponse.json({ ok: false, error: 'Agente no encontrado.' }, { status: 404 })
    }

    // Plantillas de bienvenida del agente (para el selector del cliente).
    const welcomeTemplates = await prisma.welcomeTemplate.findMany({
      where: { agentId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, isActive: true },
    })

    // Si el número no está conectado, no hay grupos reales que listar.
    const status = getDiamondStatus(agentId)
    if (status.status !== 'connected') {
      return NextResponse.json({
        ok: true,
        data: { connected: false, status: status.status, groups: [], welcomeTemplates },
      })
    }

    // Grupos reales de WhatsApp + config guardada, cruzados por groupJid.
    const [waGroups, savedConfigs] = await Promise.all([
      listDiamondGroups(agentId),
      prisma.assistantGroup.findMany({ where: { agentId }, select: GROUP_SELECT }),
    ])

    const configByJid = new Map(savedConfigs.map((c) => [c.groupJid, c]))

    const groups = waGroups.map((g) => {
      const config = configByJid.get(g.id) ?? null
      return {
        groupJid: g.id,
        subject: g.subject,
        size: g.size ?? null,
        config,
      }
    })

    return NextResponse.json({
      ok: true,
      data: { connected: true, status: status.status, groups, welcomeTemplates },
    })
  } catch (err) {
    console.error('[diamond-assistant/groups GET]', err)
    return NextResponse.json(
      { ok: false, error: 'No se pudieron cargar los grupos.' },
      { status: 500 },
    )
  }
}

const upsertSchema = z.object({
  agentId: z.string().trim().min(1, 'Falta el agentId.'),
  groupJid: z.string().trim().min(1, 'Falta el groupJid.'),
  name: z.string().trim().min(1).nullable().optional(),
  automationEnabled: z.boolean().optional(),
  aiEnabled: z.boolean().optional(),
  welcomeEnabled: z.boolean().optional(),
  welcomeTemplateId: z.string().trim().min(1).nullable().optional(),
  privateWelcomeEnabled: z.boolean().optional(),
  allowedHours: z.any().optional(),
})

// POST /api/admin/diamond-assistant/groups — crea/actualiza la config de un grupo.
export async function POST(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const body = await req.json().catch(() => null)
  const parsed = upsertSchema.safeParse(body)
  if (!parsed.success) {
    const first = parsed.error.errors[0]?.message ?? 'Datos inválidos.'
    return NextResponse.json({ ok: false, error: first }, { status: 400 })
  }

  const { agentId, groupJid, name, automationEnabled, aiEnabled, welcomeEnabled, welcomeTemplateId, privateWelcomeEnabled, allowedHours } =
    parsed.data

  try {
    const agent = await prisma.assistantAgent.findUnique({
      where: { id: agentId },
      select: { id: true },
    })
    if (!agent) {
      return NextResponse.json({ ok: false, error: 'Agente no encontrado.' }, { status: 404 })
    }

    // Un solo objeto tipado que sirve para crear y actualizar (Create es
    // asignable a Update en Prisma). Solo incluimos los campos presentes.
    const data: Prisma.AssistantGroupUncheckedCreateInput = { agentId, groupJid }
    if (name !== undefined) data.name = name
    if (automationEnabled !== undefined) data.automationEnabled = automationEnabled
    if (aiEnabled !== undefined) data.aiEnabled = aiEnabled
    if (welcomeEnabled !== undefined) data.welcomeEnabled = welcomeEnabled
    if (welcomeTemplateId !== undefined) data.welcomeTemplateId = welcomeTemplateId
    if (privateWelcomeEnabled !== undefined) data.privateWelcomeEnabled = privateWelcomeEnabled
    if (allowedHours !== undefined) {
      data.allowedHours = allowedHours === null ? Prisma.DbNull : (allowedHours as Prisma.InputJsonValue)
    }

    const saved = await prisma.assistantGroup.upsert({
      where: { agentId_groupJid: { agentId, groupJid } },
      create: data,
      update: data,
      select: GROUP_SELECT,
    })

    return NextResponse.json({ ok: true, data: saved })
  } catch (err) {
    console.error('[diamond-assistant/groups POST]', err)
    return NextResponse.json(
      { ok: false, error: 'No se pudo guardar la configuración del grupo.' },
      { status: 500 },
    )
  }
}
