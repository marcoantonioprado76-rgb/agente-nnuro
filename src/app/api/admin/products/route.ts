import { NextResponse, NextRequest } from 'next/server'
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

    const search = request.nextUrl.searchParams.get('search')

    // Obtener todos los productos con info del bot, tenant y owner
    let query = service
      .from('products')
      .select(`
        id,
        name,
        description,
        price_unit,
        currency,
        is_active,
        created_at,
        bots:bot_id (
          name,
          tenants:tenant_id (
            name,
            profiles:owner_id (
              full_name,
              email
            )
          )
        )
      `)
      .order('created_at', { ascending: false })

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    const { data: products, error } = await query

    if (error) {
      console.error('Error al obtener productos:', error)
      return NextResponse.json({ error: 'Error al obtener productos' }, { status: 500 })
    }

    return NextResponse.json(products)
  } catch (error) {
    console.error('Error en GET /api/admin/products:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
