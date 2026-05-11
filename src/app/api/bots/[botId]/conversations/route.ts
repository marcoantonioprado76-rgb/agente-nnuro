export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function toClientConv(c: any) {
  return {
    id: c.id,
    userPhone: c.user_phone,
    userName: c.user_name,
    sold: c.sold,
    botDisabled: c.bot_disabled,
    updatedAt: c.updated_at,
    messages: (c.messages ?? []).map((m: any) => ({
      role: m.role,
      content: m.content,
      type: m.type,
      createdAt: m.created_at,
    })),
    _count: c._count,
  }
}

export async function GET(_req: NextRequest, { params }: { params: { botId: string } }) {
  try {
    const session = await getServerSession()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const bot = await (prisma as any).bot.findFirst({
      where: { id: params.botId, tenant_id: session.sub },
      select: { id: true },
    })
    if (!bot) return NextResponse.json({ error: 'Bot no encontrado' }, { status: 404 })

    const conversations = await (prisma as any).conversation.findMany({
      where: { bot_id: params.botId },
      orderBy: { updated_at: 'desc' },
      include: {
        messages: {
          where: { buffered: false },
          orderBy: { created_at: 'desc' },
          take: 1,
          select: { role: true, content: true, type: true, created_at: true },
        },
        _count: { select: { messages: true } },
      },
    })

    return NextResponse.json({ conversations: (conversations ?? []).map(toClientConv) })
  } catch (err) {
    console.error('[GET /api/bots/[botId]/conversations]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
