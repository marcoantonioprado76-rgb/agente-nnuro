export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { encrypt, decrypt } from '@/lib/ads/encryption'
import { validateApiKey } from '@/lib/ads/openai-ads'

const ENC_KEY = process.env.ADS_ENCRYPTION_KEY || ''

// GET — user credits + their openai config + admin key status
export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const [dbUser, openaiConfig, adminConfig, globalKeySetting, recentUsage] = await Promise.all([
      // SELECT con campos viejos + nuevos. Si Prisma client no se regeneró en Render
      // (cliente desfasado), `followupsEnabled` causaría error → fallback abajo.
      prisma.user.findUnique({
        where: { id: user.id },
        select: { aiCredits: true, aiBalanceUsd: true, preferOwnKey: true, followupsEnabled: true },
      }).catch(() => prisma.user.findUnique({
        where: { id: user.id },
        select: { aiCredits: true, aiBalanceUsd: true, preferOwnKey: true },
      })),
      (prisma as any).openAIConfig.findUnique({ where: { userId: user.id } }).catch(() => null),
      (prisma as any).adminConfig.findUnique({ where: { id: 'global' } }).catch(() => null),
      (prisma as any).appSetting.findUnique({ where: { key: 'openai_global_key' } }).catch(() => null),
      (prisma as any).aIUsageLog.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: { id: true, model: true, reason: true, costUsd: true, createdAt: true, metadata: true },
      }).catch(() => []),
    ])

    // Total gastado en los últimos 30 días (solo cargos, no compras). Tolerante a fallos.
    let spent30dUsd = 0
    try {
      const last30 = await prisma.$queryRaw<Array<{ total: string }>>`
        SELECT COALESCE(SUM(cost_usd), 0)::text AS total
        FROM ai_usage_logs
        WHERE user_id = ${user.id}::uuid
          AND cost_usd > 0
          AND created_at >= NOW() - INTERVAL '30 days'
      `
      spent30dUsd = Number(last30[0]?.total ?? 0)
    } catch (e) {
      console.warn('[credits] last30 query failed (non-fatal):', (e as Error).message)
    }

    return NextResponse.json({
      aiCredits: dbUser?.aiCredits ?? 0,
      aiBalanceUsd: dbUser?.aiBalanceUsd ? Number(dbUser.aiBalanceUsd) : 0,
      preferOwnKey: dbUser?.preferOwnKey ?? false,
      // NULL en DB = activado (default histórico para usuarios viejos sin la columna)
      followupsEnabled: (dbUser as any)?.followupsEnabled ?? true,
      adminHasKey: !!(globalKeySetting?.value) || !!(adminConfig?.openaiKeyEnc),
      ownKey: openaiConfig
        ? {
            model: openaiConfig.model,
            isValid: openaiConfig.isValid,
            validatedAt: openaiConfig.validatedAt,
            apiKeyMasked: (() => {
              try { return '••••••••••••' + decrypt(openaiConfig.apiKeyEnc, ENC_KEY).slice(-4) }
              catch { return '••••••••••••' }
            })(),
          }
        : null,
      recentUsage: (recentUsage ?? []).map((u: any) => ({
        ...u,
        costUsd: Number(u.costUsd),
      })),
      spent30dUsd,
    })
  } catch (err: any) {
    console.error('[GET /api/credits] error:', err?.message ?? err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// PUT — toggle preferOwnKey y/o followupsEnabled
export async function PUT(req: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const data: Record<string, any> = {}
  if (typeof body?.preferOwnKey === 'boolean') data.preferOwnKey = body.preferOwnKey
  if (typeof body?.followupsEnabled === 'boolean') data.followupsEnabled = body.followupsEnabled

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
  }

  await prisma.user.update({ where: { id: user.id }, data })

  return NextResponse.json({ success: true })
}

// POST — save user's own OpenAI API key
export async function POST(req: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { apiKey, model = 'gpt-4o' } = await req.json()
  if (!apiKey || typeof apiKey !== 'string') {
    return NextResponse.json({ error: 'API Key requerida' }, { status: 400 })
  }

  const isValid = await validateApiKey(apiKey.trim())
  const apiKeyEnc = encrypt(apiKey.trim(), ENC_KEY)

  await (prisma as any).openAIConfig.upsert({
    where: { userId: user.id },
    create: { userId: user.id, apiKeyEnc, model, isValid, validatedAt: isValid ? new Date() : null },
    update: { apiKeyEnc, model, isValid, validatedAt: isValid ? new Date() : null },
  })

  return NextResponse.json({
    success: true,
    isValid,
    apiKeyMasked: '••••••••••••' + apiKey.trim().slice(-4),
  })
}

// DELETE — remove user's own API key
export async function DELETE() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await (prisma as any).openAIConfig.deleteMany({ where: { userId: user.id } })
  return NextResponse.json({ success: true })
}
