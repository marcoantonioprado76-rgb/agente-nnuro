export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { BaileysManager } from '@/lib/baileys-manager'

export async function GET(_req: NextRequest, { params }: { params: { botId: string } }) {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const bot = await (prisma as any).bot.findFirst({
    where: { id: params.botId, tenant_id: session.sub },
    select: { id: true, baileys_phone: true },
  })
  if (!bot) return NextResponse.json({ error: 'Bot no encontrado' }, { status: 404 })

  const status = BaileysManager.getStatus(params.botId)
  return NextResponse.json({ ...status, phone: status.phone ?? bot.baileys_phone ?? undefined })
}

export async function DELETE(_req: NextRequest, { params }: { params: { botId: string } }) {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const bot = await (prisma as any).bot.findFirst({
    where: { id: params.botId, tenant_id: session.sub },
    select: { id: true },
  })
  if (!bot) return NextResponse.json({ error: 'Bot no encontrado' }, { status: 404 })

  BaileysManager.disconnect(params.botId)
  return NextResponse.json({ ok: true })
}
