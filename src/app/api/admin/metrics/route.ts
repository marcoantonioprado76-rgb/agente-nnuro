import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (session.role !== 'admin') return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

    const service = await createServiceRoleClient()
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const oneWeekAgo = new Date(now); oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    const oneMonthAgo = new Date(now); oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

    const [
      usersResult, botsResult, activeBotsResult, conversationsResult, soldConvsResult,
      productsResult, activeSubsResult, pendingSubsResult, rejectedSubsResult,
      paymentsResult, expiredSubsResult, pendingPaymentsResult,
      storesResult, usersToday, usersThisWeek, usersThisMonth,
    ] = await Promise.all([
      service.from('profiles').select('id, is_active', { count: 'exact' }),
      service.from('bots').select('id', { count: 'exact' }),
      service.from('bots').select('id', { count: 'exact' }).eq('status', 'ACTIVE'),
      service.from('conversations').select('id', { count: 'exact' }),
      service.from('conversations').select('id', { count: 'exact' }).eq('sold', true),
      service.from('products').select('id', { count: 'exact', head: true }),
      service.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active').eq('approval_status', 'approved'),
      service.from('subscriptions').select('id', { count: 'exact', head: true }).eq('approval_status', 'pending_review'),
      service.from('subscriptions').select('id', { count: 'exact', head: true }).eq('approval_status', 'rejected'),
      service.from('payments').select('amount').eq('payment_status', 'completed'),
      service.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'expired'),
      service.from('payments').select('id', { count: 'exact', head: true }).eq('payment_status', 'pending'),
      service.from('stores').select('id', { count: 'exact', head: true }),
      service.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
      service.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', oneWeekAgo.toISOString()),
      service.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', oneMonthAgo.toISOString()),
    ])

    const { data: recentUsers } = await service.from('profiles').select('id, full_name, email, role, is_active, created_at, last_login_at').order('created_at', { ascending: false }).limit(10)

    const activeUsers = (usersResult.data || []).filter((u: any) => u.is_active).length
    const suspendedUsers = (usersResult.data || []).filter((u: any) => !u.is_active).length
    const totalRevenue = (paymentsResult.data || []).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)

    return NextResponse.json({
      total_users: usersResult.count || 0,
      active_users: activeUsers,
      suspended_users: suspendedUsers,
      total_bots: botsResult.count || 0,
      active_bots: activeBotsResult.count || 0,
      total_conversations: conversationsResult.count || 0,
      total_sales: soldConvsResult.count || 0,
      total_products: productsResult.count || 0,
      total_leads: 0,
      total_orders: 0,
      total_stores: storesResult.count || 0,
      total_store_orders: 0,
      users_today: usersToday.count || 0,
      users_this_week: usersThisWeek.count || 0,
      users_this_month: usersThisMonth.count || 0,
      active_subscriptions: activeSubsResult.count || 0,
      pending_subscriptions: pendingSubsResult.count || 0,
      rejected_subscriptions: rejectedSubsResult.count || 0,
      expired_subscriptions: expiredSubsResult.count || 0,
      pending_payments: pendingPaymentsResult.count || 0,
      total_revenue: totalRevenue,
      recent_users: recentUsers || [],
      recent_activity: [],
    })
  } catch (error) {
    console.error('[admin/metrics]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
