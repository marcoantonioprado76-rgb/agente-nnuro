import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
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
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user')

    let query = service
      .from('stores')
      .select('*, profiles:user_id(full_name, email)')
      .order('created_at', { ascending: false })

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data: stores, error } = await query

    if (error) {
      console.error('Error fetching stores:', error)
      return NextResponse.json({ error: 'Error al obtener tiendas' }, { status: 500 })
    }

    // Get product counts and order counts per store
    const storeIds = (stores || []).map(s => s.id)

    let productCounts = new Map<string, number>()
    let orderCounts = new Map<string, number>()

    if (storeIds.length > 0) {
      const [productsRes, ordersRes] = await Promise.all([
        service.from('store_products').select('store_id').in('store_id', storeIds),
        service.from('store_orders').select('store_id').in('store_id', storeIds),
      ])

      if (productsRes.data) {
        for (const row of productsRes.data) {
          productCounts.set(row.store_id, (productCounts.get(row.store_id) || 0) + 1)
        }
      }
      if (ordersRes.data) {
        for (const row of ordersRes.data) {
          orderCounts.set(row.store_id, (orderCounts.get(row.store_id) || 0) + 1)
        }
      }
    }

    const enriched = (stores || []).map(store => ({
      ...store,
      owner_name: (store.profiles as { full_name: string } | null)?.full_name || 'Sin nombre',
      owner_email: (store.profiles as { email: string } | null)?.email || '',
      products_count: productCounts.get(store.id) || 0,
      orders_count: orderCounts.get(store.id) || 0,
    }))

    return NextResponse.json(enriched)
  } catch (error) {
    console.error('Error en GET /api/admin/stores:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
