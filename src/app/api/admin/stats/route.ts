export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const [
    totalUsers,
    activeUsers,
    pendingPurchases,
    pendingWithdrawals,
    recentPurchases,
    recentWithdrawals,
    totalRevenueRaw,
    totalCommissionsRaw,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.packPurchaseRequest.count({ where: { status: 'PENDING' } }),
    prisma.withdrawalRequest.count({ where: { status: 'PENDING' } }),
    prisma.packPurchaseRequest.findMany({
      where: { status: 'PENDING' },
      include: { user: { select: { username: true, fullName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.withdrawalRequest.findMany({
      where: { status: 'PENDING' },
      include: { user: { select: { username: true, fullName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    // Total revenue: sum of approved purchases excluding Fase Global (external payment)
    prisma.packPurchaseRequest.aggregate({
      _sum: { price: true },
      where: { status: 'APPROVED', NOT: { paymentMethod: 'FASE_GLOBAL' } },
    }),
    // Total commissions: sum of all clipping payouts issued
    prisma.clippingPayout.aggregate({
      _sum: { amountUSD: true },
    }),
  ])

  return NextResponse.json({
    stats: {
      totalUsers,
      activeUsers,
      pendingPurchases,
      pendingWithdrawals,
      totalRevenue: Number(totalRevenueRaw._sum.price ?? 0),
      totalCommissions: Number(totalCommissionsRaw._sum.amountUSD ?? 0),
    },
    recentPurchases: recentPurchases.map(r => ({ ...r, price: Number(r.price) })),
    recentWithdrawals: recentWithdrawals.map(r => ({ ...r, amount: Number(r.amount) })),
  })
}
