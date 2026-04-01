import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET: Fetch admin notifications
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verify admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const service = await createServiceRoleClient()

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unread') === 'true'
    const limit = parseInt(searchParams.get('limit') || '20')

    let query = service
      .from('admin_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (unreadOnly) {
      query = query.eq('is_read', false)
    }

    const { data: notifications, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Error al obtener notificaciones' }, { status: 500 })
    }

    // Also get unread count
    const { count } = await service
      .from('admin_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('is_read', false)

    return NextResponse.json({
      notifications: notifications || [],
      unread_count: count || 0,
    })
  } catch (error) {
    console.error('Error en GET /api/admin/notifications:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// PATCH: Mark notifications as read
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const service = await createServiceRoleClient()
    const body = await request.json()
    const { notification_ids, mark_all } = body

    if (mark_all) {
      await service
        .from('admin_notifications')
        .update({ is_read: true })
        .eq('is_read', false)
    } else if (notification_ids?.length) {
      await service
        .from('admin_notifications')
        .update({ is_read: true })
        .in('id', notification_ids)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error en PATCH /api/admin/notifications:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
