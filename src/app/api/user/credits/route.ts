export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const profile = await (prisma as any).profile.findUnique({
    where: { id: session.sub },
    select: { ai_credits_usd: true },
  })

  const credits = Number(profile?.ai_credits_usd ?? 0)
  return NextResponse.json({ credits })
}
