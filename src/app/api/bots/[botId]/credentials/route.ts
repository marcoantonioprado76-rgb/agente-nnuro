export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { encrypt, decrypt } from '@/lib/crypto'

type Ctx = { params: { botId: string } }

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const bot = await (prisma as any).bot.findFirst({
    where: { id: params.botId, tenant_id: session.sub },
    select: { id: true, type: true },
  })
  if (!bot) return NextResponse.json({ error: 'Bot no encontrado' }, { status: 404 })

  const secret = await (prisma as any).botSecret.findUnique({ where: { bot_id: params.botId } })

  return NextResponse.json({
    whatsappInstanceNumber: secret?.whatsapp_instance_number ?? '',
    reportPhone:            secret?.report_phone ?? '',
    hasYcloudKey:           !!secret?.ycloud_api_key_enc,
    hasOpenAIKey:           !!secret?.openai_api_key_enc,
    hasMetaToken:           !!secret?.meta_page_token_enc,
    metaPhoneNumberId:      secret?.meta_phone_number_id ?? '',
    metaWabaId:             secret?.meta_waba_id ?? '',
    metaPageTokenHint: (() => {
      try { return secret?.meta_page_token_enc ? decrypt(secret.meta_page_token_enc).slice(0, 8) + '...' : '' } catch { return '' }
    })(),
    openaiKeyHint: (() => {
      try { return secret?.openai_api_key_enc ? decrypt(secret.openai_api_key_enc).slice(0, 8) + '...' : '' } catch { return '' }
    })(),
  })
}

export async function PUT(request: NextRequest, { params }: Ctx) {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const bot = await (prisma as any).bot.findFirst({
    where: { id: params.botId, tenant_id: session.sub },
    select: { id: true, type: true },
  })
  if (!bot) return NextResponse.json({ error: 'Bot no encontrado' }, { status: 404 })

  const isBaileys       = bot.type === 'BAILEYS'
  const isMeta          = bot.type === 'META'
  const isWhatsappCloud = bot.type === 'WHATSAPP_CLOUD'
  const isMetaFamily    = isMeta || isWhatsappCloud

  const body = await request.json().catch(() => ({})) as Record<string, string>
  const { ycloudApiKey, openaiApiKey, whatsappInstanceNumber, reportPhone, metaPageToken, metaPhoneNumberId, metaWabaId } = body

  if (!isBaileys && !isMetaFamily && !whatsappInstanceNumber?.trim())
    return NextResponse.json({ error: 'El número de WhatsApp es requerido' }, { status: 400 })

  const existing = await (prisma as any).botSecret.findUnique({ where: { bot_id: params.botId } })

  const ycloudEnc    = ycloudApiKey?.trim()   ? encrypt(ycloudApiKey.trim())   : existing?.ycloud_api_key_enc   ?? (isBaileys || isMetaFamily ? 'N/A' : '')
  const openaiEnc    = openaiApiKey?.trim()   ? encrypt(openaiApiKey.trim())   : existing?.openai_api_key_enc   ?? ''
  const metaTokenEnc = metaPageToken?.trim()  ? encrypt(metaPageToken.trim())  : existing?.meta_page_token_enc  ?? null

  if (!openaiEnc) return NextResponse.json({ error: 'La API key de OpenAI es requerida la primera vez' }, { status: 400 })
  if (!isBaileys && !isMetaFamily && !ycloudEnc) return NextResponse.json({ error: 'La API key de YCloud es requerida la primera vez' }, { status: 400 })

  await (prisma as any).botSecret.upsert({
    where: { bot_id: params.botId },
    create: {
      bot_id:                   params.botId,
      ycloud_api_key_enc:       ycloudEnc,
      openai_api_key_enc:       openaiEnc,
      whatsapp_instance_number: (!isBaileys && !isMetaFamily) ? (whatsappInstanceNumber?.trim() ?? '') : '',
      report_phone:             !isMeta ? (reportPhone?.trim() ?? '') : '',
      meta_page_token_enc:      metaTokenEnc,
      meta_phone_number_id:     metaPhoneNumberId?.trim() || null,
      meta_waba_id:             metaWabaId?.trim() || null,
    },
    update: {
      ycloud_api_key_enc:       ycloudEnc,
      openai_api_key_enc:       openaiEnc,
      whatsapp_instance_number: (!isBaileys && !isMetaFamily) ? (whatsappInstanceNumber?.trim() ?? '') : '',
      report_phone:             !isMeta ? (reportPhone?.trim() ?? '') : '',
      ...(metaTokenEnc              && { meta_page_token_enc:    metaTokenEnc }),
      ...(metaPhoneNumberId?.trim() && { meta_phone_number_id:   metaPhoneNumberId.trim() }),
      ...(metaWabaId?.trim()        && { meta_waba_id:           metaWabaId.trim() }),
    },
  })

  return NextResponse.json({ ok: true })
}
