export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { getPlanLimits, type UserPlan } from '@/lib/plan-limits'

// GET /api/admin/users/[id]/detail — read-only info panel for a single user
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  try {
    const user = await prisma.user.findUnique({ where: { id: params.id } })
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const limits = getPlanLimits(user.plan as UserPlan)

    // total = plan + extra, preserving Infinity when the plan limit is unbounded
    const withExtra = (plan: number, extra: number) =>
      plan === Infinity ? Infinity : plan + extra

    const [botsUsed, storesUsed, productsUsed, landingsUsed] = await Promise.all([
      prisma.bot.count({ where: { userId: user.id, isReto: false } }),
      prisma.store.count({ where: { userId: user.id } }),
      prisma.product.count({ where: { userId: user.id } }),
      prisma.builderPage.count({ where: { userId: user.id } }),
    ])

    return NextResponse.json({
      cuenta: {
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        country: user.country,
        city: user.city,
        plan: user.plan,
        planExpiresAt: user.planExpiresAt,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
      limites: {
        bots: {
          plan: limits.bots,
          extra: user.extraBots,
          total: withExtra(limits.bots, user.extraBots),
        },
        stores: {
          plan: limits.stores,
          extra: user.extraStores,
          total: withExtra(limits.stores, user.extraStores),
        },
        products: {
          plan: limits.productsPerUser,
          extra: user.extraProducts,
          total: withExtra(limits.productsPerUser, user.extraProducts),
        },
        landingPages: {
          plan: limits.landingPages,
          extra: user.extraLandingPages,
          total: withExtra(limits.landingPages, user.extraLandingPages),
        },
        adsPerMonth: {
          plan: limits.adsPerMonth,
          extra: user.extraAdsPerMonth,
          total: withExtra(limits.adsPerMonth, user.extraAdsPerMonth),
        },
      },
      uso: {
        bots: botsUsed,
        stores: storesUsed,
        products: productsUsed,
        landings: landingsUsed,
      },
      saldoIa: Number(user.aiBalanceUsd),
    })
  } catch (err) {
    console.error('[USER DETAIL] GET error:', err)
    return NextResponse.json({ error: 'Error al obtener el detalle del usuario' }, { status: 500 })
  }
}
