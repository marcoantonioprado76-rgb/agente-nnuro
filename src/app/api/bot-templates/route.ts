export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const templates = await (prisma as any).botTemplate.findMany({
    where: { active: true },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, name: true, description: true, category: true, aiModel: true,
      maxCharsMensaje1: true, maxCharsMensaje2: true, maxCharsMensaje3: true,
      followUp1Delay: true, followUp2Delay: true, createdAt: true,
    },
  })

  return NextResponse.json({ templates })
}
