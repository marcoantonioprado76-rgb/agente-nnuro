export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const planLabel = (user as any).plan && (user as any).plan !== 'NONE' ? (user as any).plan : undefined

    return NextResponse.json({
      user: {
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        country: user.country,
        city: user.city,
        identityDocument: user.identityDocument,
        dateOfBirth: user.dateOfBirth,
        isActive: user.isActive,
        avatarUrl: user.avatarUrl ?? null,
        rank: planLabel,
        planExpiresAt: (user as any).planExpiresAt ? new Date((user as any).planExpiresAt).toISOString() : null,
        createdAt: user.createdAt,
      },
      tree: [],
      stats: {
        directReferrals: 0,
        totalNetwork: 0,
        totalActive: 0,
        totalCommissions: 0,
        earningsToday: 0,
        earningsYesterday: 0,
        earningsWeek: 0,
        sponsorshipBonus: 0,
        sponsorshipLevels: { level1: 0, level2: 0, level3: 0, other: 0 },
        directBonus: 0,
        extraBonus: 0,
        sharedBonus: 0,
        pendingBalance: 0,
      }
    })
  } catch (err) {
    console.error('[GET /api/network]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
