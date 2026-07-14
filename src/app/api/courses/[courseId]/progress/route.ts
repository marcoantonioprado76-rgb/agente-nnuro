import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: { courseId: string } }
) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { videoId, percent, posicionSegundos } = await req.json()
  if (!videoId) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const pos = typeof posicionSegundos === 'number' && posicionSegundos >= 0 ? Math.round(posicionSegundos) : undefined

  // El porcentaje solo sube (no se "des-completa" si el usuario retrocede el video).
  const existing = await (prisma as any).videoProgress.findUnique({
    where: { userId_videoId: { userId: user.id, videoId } },
    select: { percent: true },
  })
  const incoming = typeof percent === 'number' ? Math.round(percent) : 0
  const newPercent = Math.max(existing?.percent ?? 0, incoming)
  const completed = newPercent >= 95

  await (prisma as any).videoProgress.upsert({
    where: { userId_videoId: { userId: user.id, videoId } },
    update: {
      percent: newPercent,
      completed,
      ...(pos !== undefined ? { posicionSegundos: pos } : {}),
      updatedAt: new Date(),
    },
    create: {
      userId: user.id,
      videoId,
      courseId: params.courseId,
      percent: newPercent,
      completed,
      posicionSegundos: pos ?? 0,
    },
  })

  return NextResponse.json({ ok: true, completed })
}
