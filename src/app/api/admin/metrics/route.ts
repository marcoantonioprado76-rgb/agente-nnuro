import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const service = await createServiceRoleClient()

    // Obtener métricas globales en paralelo
    const [
      usersResult,
      botsResult,
      activeBotsResult,
      conversationsResult,
      leadsResult,
      ordersResult,
      activeSubsResult,
      pendingSubsResult,
      rejectedSubsResult,
      paymentsResult,
    ] = await Promise.all([
      service.from('profiles').select('id, is_active', { count: 'exact' }),
      service.from('bots').select('id', { count: 'exact' }),
      service.from('bots').select('id', { count: 'exact' }).eq('is_active', true),
      service.from('conversations').select('id', { count: 'exact' }),
      service.from('leads').select('id', { count: 'exact' }),
      service.from('orders').select('id', { count: 'exact' }),
      service.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active').eq('approval_status', 'approved'),
      service.from('subscriptions').select('id', { count: 'exact', head: true }).eq('approval_status', 'pending_review'),
      service.from('subscriptions').select('id', { count: 'exact', head: true }).eq('approval_status', 'rejected'),
      service.from('payments').select('amount').eq('payment_status', 'completed'),
    ])

    // Métricas temporales
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const oneWeekAgo = new Date(now)
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    const oneMonthAgo = new Date(now)
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

    const [
      usersToday,
      usersThisWeek,
      usersThisMonth,
      productsResult,
      expiredSubsResult,
      pendingPaymentsResult,
      recentActivity,
      storesResult,
      storeOrdersResult,
    ] = await Promise.all([
      service.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
      service.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', oneWeekAgo.toISOString()),
      service.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', oneMonthAgo.toISOString()),
      service.from('products').select('id', { count: 'exact', head: true }),
      service.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'expired'),
      service.from('payments').select('id', { count: 'exact', head: true }).eq('payment_status', 'pending'),
      service.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(10),
      service.from('stores').select('id', { count: 'exact', head: true }),
      service.from('store_orders').select('id', { count: 'exact', head: true }),
    ])

    // Últimos usuarios registrados
    const { data: recentUsers } = await service
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    // Enrich audit logs with profile info
    const auditUserIds = [...new Set((recentActivity.data || []).map((a: Record<string, string>) => a.user_id).filter(Boolean))]
    const { data: auditProfiles } = auditUserIds.length > 0
      ? await service.from('profiles').select('id, full_name, email').in('id', auditUserIds)
      : { data: [] }
    const auditProfileMap = new Map((auditProfiles || []).map(p => [p.id, p]))
    const enrichedActivity = (recentActivity.data || []).map((a: Record<string, unknown>) => ({
      ...a,
      profile: auditProfileMap.get(a.user_id as string) || null,
    }))

    const activeUsers = usersResult.data?.filter(u => u.is_active).length || 0
    const suspendedUsers = usersResult.data?.filter(u => !u.is_active).length || 0

    const totalRevenue = (paymentsResult.data || []).reduce((sum, p) => sum + (p.amount || 0), 0)

    return NextResponse.json({
      total_users: usersResult.count || 0,
      active_users: activeUsers,
      suspended_users: suspendedUsers,
      total_bots: botsResult.count || 0,
      active_bots: activeBotsResult.count || 0,
      total_conversations: conversationsResult.count || 0,
      total_leads: leadsResult.count || 0,
      total_orders: ordersResult.count || 0,
      total_products: productsResult.count || 0,
      users_today: usersToday.count || 0,
      users_this_week: usersThisWeek.count || 0,
      users_this_month: usersThisMonth.count || 0,
      active_subscriptions: activeSubsResult.count || 0,
      pending_subscriptions: pendingSubsResult.count || 0,
      rejected_subscriptions: rejectedSubsResult.count || 0,
      expired_subscriptions: expiredSubsResult.count || 0,
      pending_payments: pendingPaymentsResult.count || 0,
      total_revenue: totalRevenue,
      total_stores: storesResult.count || 0,
      total_store_orders: storeOrdersResult.count || 0,
      recent_users: recentUsers || [],
      recent_activity: enrichedActivity,
    })
  } catch (error) {
    console.error('Error en GET /api/admin/metrics:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
