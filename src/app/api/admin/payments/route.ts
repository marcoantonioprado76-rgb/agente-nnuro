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

    // Fetch payments without FK join to avoid ambiguity (user_id has FK to both auth.users and profiles)
    const { data: payments, error } = await service
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching payments:', error)
      return NextResponse.json({ error: 'Error al obtener pagos' }, { status: 500 })
    }

    // Fetch profile info separately
    const userIds = [...new Set((payments || []).map(p => p.user_id))]
    const { data: profiles } = userIds.length > 0
      ? await service.from('profiles').select('id, full_name, email').in('id', userIds)
      : { data: [] }

    const profileMap = new Map((profiles || []).map(p => [p.id, p]))

    const enriched = (payments || []).map(pay => ({
      ...pay,
      profile: profileMap.get(pay.user_id) || null,
    }))

    return NextResponse.json(enriched)
  } catch (error) {
    console.error('Error en GET /api/admin/payments:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
