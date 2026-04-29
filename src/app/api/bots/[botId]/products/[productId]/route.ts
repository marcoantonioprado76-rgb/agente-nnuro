export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(_req: NextRequest, { params }: { params: { botId: string; productId: string } }) {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const bot = await (prisma as any).bot.findFirst({
    where: { id: params.botId, tenant_id: session.sub },
    select: { id: true },
  })
  if (!bot) return NextResponse.json({ error: 'Bot no encontrado' }, { status: 404 })

  await (prisma as any).product.updateMany({
    where: { id: params.productId, tenant_id: session.sub },
    data: { bot_id: null },
  })
  return NextResponse.json({ ok: true })
}
