export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { REFERRAL_PERCENT } from '@/lib/referrals'

export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const code = (user as any).referralCode || user.username

    const referrals = await prisma.referral.findMany({
      where: { referrerId: user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        status: true,
        rewardUsd: true,
        createdAt: true,
        completedAt: true,
        referred: { select: { username: true, fullName: true } },
      },
    })

    const completed = referrals.filter(r => r.status === 'COMPLETED')
    const totalEarned = completed.reduce((s, r) => s + Number(r.rewardUsd), 0)

    const base = process.env.NEXT_PUBLIC_APP_URL || process.env.BASE_URL || 'https://agentenuro.com'

    return NextResponse.json({
      code,
      link: `${base.replace(/\/$/, '')}/register?ref=${encodeURIComponent(code)}`,
      percent: REFERRAL_PERCENT,
      stats: {
        total: referrals.length,
        activos: completed.length,
        pendientes: referrals.filter(r => r.status === 'PENDING').length,
        ganadoUsd: Math.round(totalEarned * 100) / 100,
      },
      referrals: referrals.map(r => ({
        nombre: r.referred?.fullName || r.referred?.username || 'Usuario',
        usuario: r.referred?.username || '',
        fecha: r.createdAt,
        estado: r.status,
        recompensa: Number(r.rewardUsd),
      })),
    })
  } catch (err) {
    console.error('[GET /api/referrals/me]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
