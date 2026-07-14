export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { encrypt, decrypt } from '@/lib/crypto'

function getAuth() {
  const cookieStore = cookies()
  const token = cookieStore.get('auth_token')?.value
  if (!token) return null
  return verifyToken(token)
}

/** GET /api/bots/[botId]/credentials – returns non-sensitive fields only */
export async function GET(
  _request: NextRequest,
  { params }: { params: { botId: string } },
) {
  const auth = getAuth()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const bot = await prisma.bot.findFirst({
    where: { id: params.botId, userId: auth.userId },
    include: {
      secret: {
        select: {
          whatsappInstanceNumber: true,
          reportPhone: true,
          ycloudApiKeyEnc: true,
          openaiApiKeyEnc: true,
          metaPageTokenEnc: true,
        },
      },
    },
  })

  if (!bot) return NextResponse.json({ error: 'Bot no encontrado' }, { status: 404 })

  return NextResponse.json({
    whatsappInstanceNumber: bot.secret?.whatsappInstanceNumber ?? '',
    reportPhone: bot.secret?.reportPhone ?? '',
    hasYcloudKey: !!bot.secret?.ycloudApiKeyEnc,
    hasOpenAIKey: !!bot.secret?.openaiApiKeyEnc,
    hasMetaToken: !!bot.secret?.metaPageTokenEnc,
    // Return masked page token hint for META bots
    metaPageTokenHint: (() => {
      try {
        return bot.secret?.metaPageTokenEnc
          ? decrypt(bot.secret.metaPageTokenEnc).slice(0, 8) + '...'
          : ''
      } catch { return '' }
    })(),
  })
}

/** PUT /api/bots/[botId]/credentials – upsert bot credentials */
export async function PUT(
  request: NextRequest,
  { params }: { params: { botId: string } },
) {
  const auth = getAuth()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const bot = await prisma.bot.findFirst({
    where: { id: params.botId, userId: auth.userId },
    include: { secret: { select: { ycloudApiKeyEnc: true, openaiApiKeyEnc: true, metaPageTokenEnc: true } } },
  })
  if (!bot) return NextResponse.json({ error: 'Bot no encontrado' }, { status: 404 })

  const isBaileys = bot.type === 'BAILEYS'
  const isMeta    = bot.type === 'META'

  const body = await request.json() as Record<string, string>
  const { ycloudApiKey, openaiApiKey, whatsappInstanceNumber, reportPhone, metaPageToken } = body

  // Validaciones según tipo de bot
  if (!isBaileys && !isMeta && !whatsappInstanceNumber?.trim()) {
    return NextResponse.json({ error: 'El número de WhatsApp es requerido' }, { status: 400 })
  }
  if (!isMeta && !reportPhone?.trim()) {
    return NextResponse.json({ error: 'El número de reporte es requerido' }, { status: 400 })
  }
  if (isMeta && !metaPageToken?.trim() && !bot.secret?.metaPageTokenEnc) {
    return NextResponse.json({ error: 'El Page Access Token de Meta es requerido' }, { status: 400 })
  }

  const existingYcloud    = bot.secret?.ycloudApiKeyEnc
  const existingOpenai    = bot.secret?.openaiApiKeyEnc
  const existingMetaToken = bot.secret?.metaPageTokenEnc

  const ycloudEnc = ycloudApiKey?.trim()
    ? encrypt(ycloudApiKey.trim())
    : existingYcloud ?? (isBaileys || isMeta ? 'N/A' : '')

  const openaiEnc = openaiApiKey?.trim()
    ? encrypt(openaiApiKey.trim())
    : existingOpenai ?? ''

  const metaTokenEnc = metaPageToken?.trim()
    ? encrypt(metaPageToken.trim())
    : existingMetaToken ?? null

  // OpenAI key: si el usuario no pone una propia, permitimos guardar vacío
  // siempre que exista la key global del admin (en cualquiera de los 2 lugares
  // legacy: AppSetting o AdminConfig). El bot-engine ya usa chargeUserForAI()
  // como fallback automático con cobro de saldo USD.
  if (!openaiEnc) {
    const [globalKey, adminCfg, userRow] = await Promise.all([
      (prisma as any).appSetting.findUnique({ where: { key: 'openai_global_key' } }),
      (prisma as any).adminConfig.findUnique({ where: { id: 'global' } }),
      prisma.user.findUnique({ where: { id: auth.userId }, select: { aiBalanceUsd: true, preferOwnKey: true } }),
    ])
    const hasAdminFallback = !!(globalKey?.value) || !!(adminCfg?.openaiKeyEnc)
    const userBalance = userRow?.aiBalanceUsd ? Number(userRow.aiBalanceUsd) : 0

    // Sólo bloqueamos si NO hay forma de procesar IA: ni key propia, ni key admin disponible.
    if (!hasAdminFallback) {
      return NextResponse.json(
        { error: 'Configurá tu API key de OpenAI o pedile al admin que active la key global del sistema.' },
        { status: 400 },
      )
    }
    // Si hay key admin pero el usuario tampoco tiene saldo, avisamos pero NO bloqueamos
    if (userBalance <= 0) {
      console.log(`[bot/credentials] Bot ${params.botId} se crea sin key propia. Saldo USD del usuario: ${userBalance}. Necesitará comprar saldo o configurar su key antes de que el bot responda.`)
    }
  }
  if (!isBaileys && !isMeta && !ycloudEnc) {
    return NextResponse.json(
      { error: 'La API key de YCloud es requerida la primera vez' },
      { status: 400 },
    )
  }

  await prisma.botSecret.upsert({
    where: { botId: params.botId },
    create: {
      botId: params.botId,
      ycloudApiKeyEnc: ycloudEnc,
      openaiApiKeyEnc: openaiEnc,
      whatsappInstanceNumber: (isBaileys || isMeta) ? '' : whatsappInstanceNumber?.trim() ?? '',
      reportPhone: isMeta ? '' : reportPhone.trim(),
      ...(metaTokenEnc && { metaPageTokenEnc: metaTokenEnc }),
    },
    update: {
      ycloudApiKeyEnc: ycloudEnc,
      openaiApiKeyEnc: openaiEnc,
      ...(!isBaileys && !isMeta && whatsappInstanceNumber?.trim() && {
        whatsappInstanceNumber: whatsappInstanceNumber.trim(),
      }),
      ...(!isMeta && { reportPhone: reportPhone.trim() }),
      ...(metaTokenEnc && { metaPageTokenEnc: metaTokenEnc }),
    },
  })

  return NextResponse.json({ ok: true })
}

