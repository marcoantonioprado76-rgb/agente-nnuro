import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: { botId: string } }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const bot = await prisma.bot.findFirst({ where: { id: params.botId, userId: user.id } })
  if (!bot) return NextResponse.json({ error: 'Bot no encontrado' }, { status: 404 })

  const conversations = await prisma.conversation.findMany({
    where: { botId: params.botId },
    orderBy: { updatedAt: 'desc' },
    include: {
      messages: {
        where: { buffered: false },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      _count: { select: { messages: { where: { buffered: false } } } },
    },
  })

  return NextResponse.json({ conversations })
}
