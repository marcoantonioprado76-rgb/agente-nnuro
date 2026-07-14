export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/crypto'
import { invalidateRetoConfigCache } from '@/lib/whatsapp/reto90dSender'
import { handleRouteError } from '../_shared'

// GET /api/admin/reto-90d/settings
// Configuración de WhatsApp del reto + bots disponibles para asignar.
export async function GET(_req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const [config, bots] = await Promise.all([
    prisma.whatsAppConfig.findFirst(),
    prisma.bot.findMany({
      select: { id: true, name: true, baileysPhone: true, status: true, type: true },
    }),
  ])

  // Nunca devolvemos las keys (ni cifradas): solo si existen configuradas.
  const hasOpenaiKey = !!config?.openaiApiKeyEnc
  const hasElevenKey = !!config?.elevenLabsApiKeyEnc
  const safeConfig = config ? { ...config, openaiApiKeyEnc: undefined, elevenLabsApiKeyEnc: undefined } : null
  return NextResponse.json({ config: safeConfig, bots, hasOpenaiKey, hasElevenKey })
}

// Hora del día en formato 24h HH:MM (00:00–23:59).
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora inválida (usa HH:MM)')

const patchSchema = z.object({
  challengeId: z.string().nullable().optional(),
  botId: z.string().nullable().optional(),
  adminPhone: z.string().nullable().optional(),
  groupId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  sendGroupReports: z.boolean().optional(),
  morningReminderTime: hhmm.optional(),
  middayReminderTime: hhmm.optional(),
  afternoonReminderTime: hhmm.optional(),
  nightReminderTime: hhmm.optional(),
  finalReportTime: hhmm.optional(),
  timezone: z.string().optional(),
  botInstructions: z.string().nullable().optional(),
  welcomeMessage: z.string().nullable().optional(),
  voiceId: z.string().nullable().optional(),
  // Keys en claro desde el form: '' o null = borrar; undefined = no tocar.
  openaiApiKey: z.string().nullable().optional(),
  elevenLabsApiKey: z.string().nullable().optional(),
})

// PATCH /api/admin/reto-90d/settings
// Upsert de la configuración de WhatsApp: si ya existe una fila la actualiza,
// si no la crea. Solo hay una configuración global del reto.
export async function PATCH(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const body = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { openaiApiKey, elevenLabsApiKey, ...rest } = parsed.data
  const data: Record<string, unknown> = { ...rest }

  // Manejo de las keys: undefined = no tocar; '' o null = borrar; texto = cifrar y guardar.
  if (openaiApiKey !== undefined) {
    const trimmed = (openaiApiKey ?? '').trim()
    data.openaiApiKeyEnc = trimmed ? encrypt(trimmed) : null
  }
  if (elevenLabsApiKey !== undefined) {
    const trimmed = (elevenLabsApiKey ?? '').trim()
    data.elevenLabsApiKeyEnc = trimmed ? encrypt(trimmed) : null
  }

  try {
    const existing = await prisma.whatsAppConfig.findFirst()
    const saved = existing
      ? await prisma.whatsAppConfig.update({ where: { id: existing.id }, data })
      : await prisma.whatsAppConfig.create({ data })

    invalidateRetoConfigCache()

    const hasOpenaiKey = !!saved.openaiApiKeyEnc
    const hasElevenKey = !!saved.elevenLabsApiKeyEnc
    return NextResponse.json({
      config: { ...saved, openaiApiKeyEnc: undefined, elevenLabsApiKeyEnc: undefined },
      hasOpenaiKey,
      hasElevenKey,
    })
  } catch (err) {
    return handleRouteError(err, 'settings PATCH')
  }
}
