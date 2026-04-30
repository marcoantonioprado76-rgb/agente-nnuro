export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/crypto'
import { BaileysManager } from '@/lib/baileys-manager'

export async function POST(_req: NextRequest, { params }: { params: { botId: string } }) {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const bot = await (prisma as any).bot.findFirst({
    where: { id: params.botId, tenant_id: session.sub, type: 'BAILEYS' },
    include: { bot_secrets: true },
  })
  if (!bot) return NextResponse.json({ error: 'Bot no encontrado' }, { status: 404 })

  let openaiKey = ''
  if (bot.bot_secrets?.openai_api_key_enc) {
    try { openaiKey = decrypt(bot.bot_secrets.openai_api_key_enc) } catch { /* ignore */ }
  }

  BaileysManager.connect(bot.id, bot.name, openaiKey, bot.bot_secrets?.report_phone || '').catch(err =>
    console.error('[BAILEYS] connect error:', err)
  )
  return NextResponse.json({ ok: true })
}
