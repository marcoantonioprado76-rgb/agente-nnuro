import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET: Fetch user notifications (for regular users)
// Admin users get admin_notifications, regular users get user_notifications
export async function GET(request: NextRequest) {
  try {
    const service = await createServiceRoleClient()
    const session = await getServerSession()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    
        const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '30')

    if (session.role === 'admin') {
      // Admin: fetch from admin_notifications
      const { data: notifications } = await service
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      const { count } = await service
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('is_read', false)

      return NextResponse.json({
        notifications: (notifications || []).map(n => ({
          ...n,
          link: getAdminNotificationLink(n.type, n),
        })),
        unread_count: count || 0,
      })
    }

    // Regular user: fetch from user_notifications
    const { data: notifications } = await service
      .from('user_notifications')
      .select('*')
      .eq('user_id', session.sub)
      .order('created_at', { ascending: false })
      .limit(limit)

    const { count } = await service
      .from('user_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', session.sub)
      .eq('is_read', false)

    return NextResponse.json({
      notifications: notifications || [],
      unread_count: count || 0,
    })
  } catch (error) {
    console.error('Error en GET /api/notifications:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// PATCH: Mark notifications as read
export async function PATCH(request: NextRequest) {
  try {
    const service = await createServiceRoleClient()
        const session = await getServerSession()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { data: profile } = await service
      .from('profiles')
      .select('role')
      .eq('id', session.sub)
      .single()

        const body = await request.json()
    const { notification_ids, mark_all } = body

    const table = session.role === 'admin' ? 'notifications' : 'user_notifications'

    if (mark_all) {
      let query = service
        .from(table)
        .update({ is_read: true })
        .eq('is_read', false)

      // Regular users: only update their own
      if (session.role !== 'admin') {
        query = query.eq('user_id', session.sub)
      }

      await query
    } else if (notification_ids?.length) {
      let query = service
        .from(table)
        .update({ is_read: true })
        .in('id', notification_ids)

      if (session.role !== 'admin') {
        query = query.eq('user_id', session.sub)
      }

      await query
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error en PATCH /api/notifications:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// Helper to determine navigation link for admin notifications
function getAdminNotificationLink(type: string, notification: Record<string, unknown>): string {
  const meta = (notification.metadata || {}) as Record<string, unknown>
  switch (type) {
    case 'usuario_registrado':
      return '/admin/users'
    case 'pago_exitoso':
    case 'pago_fallido':
      return '/admin/payments'
    case 'suscripcion_activada':
    case 'suscripcion_vencida':
    case 'suscripcion_cancelada':
      return '/admin/subscriptions'
    case 'bot_creado':
      return meta.bot_id ? `/bots/${meta.bot_id}` : '/admin/bots'
    case 'venta_confirmada':
      return '/admin/stores'
    default:
      return '/admin/dashboard'
  }
}
