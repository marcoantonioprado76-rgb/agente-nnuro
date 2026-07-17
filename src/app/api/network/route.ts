export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const planLabel = (user as any).plan && (user as any).plan !== 'NONE' ? (user as any).plan : undefined

    // Métricas reales del negocio (tarjeta de perfil del Inicio).
    //  - leads    = conversaciones (gente que escribió a sus bots).
    //  - ventas   = conversaciones vendidas + pedidos de tienda pagados.
    //  - ingresos = suma de pedidos de tienda PAGADOS (aprobado/enviado/entregado).
    // Si algo falla → 0 (nunca rompe).
    let leads = 0, ventas = 0, ingresos = 0
    try {
      const PAID: any[] = ['APPROVED', 'SHIPPED', 'DELIVERED']
      const [leadCount, soldConvos, paidOrders] = await Promise.all([
        prisma.conversation.count({ where: { bot: { userId: user.id } } }),
        prisma.conversation.count({ where: { bot: { userId: user.id }, sold: true } }),
        prisma.storeOrder.aggregate({ _sum: { totalPrice: true }, _count: true, where: { userId: user.id, status: { in: PAID } } }),
      ])
      leads = leadCount
      ventas = soldConvos + (paidOrders._count ?? 0)
      ingresos = Number(paidOrders._sum.totalPrice ?? 0)
    } catch (e) {
      console.error('[network] métricas negocio:', e instanceof Error ? e.message : e)
    }

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
      business: { ingresos, leads, ventas },
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
