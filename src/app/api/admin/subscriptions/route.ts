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

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const service = await createServiceRoleClient()

    // Fetch subscriptions with plan info
    const { data: subscriptions, error } = await service
      .from('subscriptions')
      .select('*, plan:plan_id(name, slug, price)')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching subscriptions:', error)
      return NextResponse.json({ error: 'Error al obtener suscripciones' }, { status: 500 })
    }

    // Fetch profile info separately to avoid FK ambiguity
    const userIds = [...new Set((subscriptions || []).map(s => s.user_id))]
    const { data: profiles } = userIds.length > 0
      ? await service.from('profiles').select('id, full_name, email, role').in('id', userIds)
      : { data: [] }

    const profileMap = new Map((profiles || []).map(p => [p.id, p]))

    const enriched = (subscriptions || []).map(sub => ({
      ...sub,
      profile: profileMap.get(sub.user_id) || null,
    }))

    return NextResponse.json(enriched)
  } catch (error) {
    console.error('Error en GET /api/admin/subscriptions:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
