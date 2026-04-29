export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/crypto'
import { listWaTemplates, createWaTemplate, deleteWaTemplate, WaTemplateButton } from '@/lib/whatsapp-cloud'

type Params = { params: { botId: string } }

async function getWaCloudBot(botId: string, tenantId: string) {
  return (prisma as any).bot.findFirst({
    where: { id: botId, tenant_id: tenantId, type: 'WHATSAPP_CLOUD' },
    include: { bot_secrets: true },
  })
}

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const bot = await getWaCloudBot(params.botId, session.sub)
  if (!bot) return NextResponse.json({ error: 'Bot no encontrado' }, { status: 404 })

  const secret = bot.bot_secrets
  if (!secret?.meta_page_token_enc || !secret?.meta_waba_id) {
    return NextResponse.json({ error: 'Configurá el WABA ID en las credenciales del bot' }, { status: 400 })
  }

  try {
    const token  = decrypt(secret.meta_page_token_enc)
    const data   = await listWaTemplates(secret.meta_waba_id, token) as any
    return NextResponse.json({ templates: data.data ?? [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 })
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const bot = await getWaCloudBot(params.botId, session.sub)
  if (!bot) return NextResponse.json({ error: 'Bot no encontrado' }, { status: 404 })

  const secret = bot.bot_secrets
  if (!secret?.meta_page_token_enc || !secret?.meta_waba_id) {
    return NextResponse.json({ error: 'Configurá el WABA ID en las credenciales del bot' }, { status: 400 })
  }

  const body = await req.json() as {
    name?: string
    language?: string
    category?: string
    bodyText?: string
    headerType?: 'NONE' | 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT'
    headerText?: string
    headerMediaUrl?: string
    footerText?: string
    buttons?: WaTemplateButton[]
  }

  const { name, language, category, bodyText, headerType, headerText, headerMediaUrl, footerText, buttons } = body
  if (!name?.trim())     return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })
  if (!bodyText?.trim()) return NextResponse.json({ error: 'El texto del cuerpo es requerido' }, { status: 400 })

  const safeName = name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')
  const token    = decrypt(secret.meta_page_token_enc)

  try {
    const result = await createWaTemplate(secret.meta_waba_id, token, {
      name: safeName, language: language || 'es', category: category || 'MARKETING',
      bodyText: bodyText.trim(), headerType, headerText, headerMediaUrl, footerText, buttons,
    })
    return NextResponse.json({ ok: true, template: result }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 })
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const bot = await getWaCloudBot(params.botId, session.sub)
  if (!bot) return NextResponse.json({ error: 'Bot no encontrado' }, { status: 404 })

  const secret = bot.bot_secrets
  if (!secret?.meta_page_token_enc || !secret?.meta_waba_id) {
    return NextResponse.json({ error: 'Configurá el WABA ID en las credenciales del bot' }, { status: 400 })
  }

  const name = new URL(req.url).searchParams.get('name')
  if (!name) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })

  try {
    await deleteWaTemplate(secret.meta_waba_id, decrypt(secret.meta_page_token_enc), name)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 })
  }
}
