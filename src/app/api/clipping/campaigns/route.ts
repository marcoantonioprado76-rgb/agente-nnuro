export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

function getAuth() {
  const cookieStore = cookies()
  const token = cookieStore.get('auth_token')?.value
  if (!token) return null
  return verifyToken(token)
}

/** GET /api/clipping/campaigns — list active campaigns */
export async function GET() {
  try {
    const auth = getAuth()
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const now = new Date()
    const campaigns = await prisma.clippingCampaign.findMany({
      where: {
        isActive: true,
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      },
      select: {
        id: true,
        title: true,
        description: true,
        platform: true,
        cpmUSD: true,
        holdHours: true,
        minViews: true,
        imageUrls: true,
        endsAt: true,
        createdAt: true,
        _count: { select: { submissions: true } },
      } as any,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ campaigns })
  } catch (err) {
    console.error('[GET /api/clipping/campaigns]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
