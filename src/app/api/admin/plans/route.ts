import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

async function isAdmin(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin'
}

// GET all plans (including inactive)
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    if (!(await isAdmin(supabase))) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const service = await createServiceRoleClient()
    const { data, error } = await service
      .from('plans')
      .select('*')
      .order('sort_order')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data || [])
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// POST - create a new plan
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    if (!(await isAdmin(supabase))) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { name, slug, price, currency, max_bots, max_products, max_conversations, max_whatsapp_numbers, features, is_active, sort_order, stripe_price_id } = body

    if (!name || !slug) {
      return NextResponse.json({ error: 'Nombre y slug son requeridos' }, { status: 400 })
    }

    const service = await createServiceRoleClient()
    const { data, error } = await service
      .from('plans')
      .insert({
        name,
        slug,
        price: price || 0,
        currency: currency || 'USD',
        max_bots: max_bots || 1,
        max_products: max_products || 5,
        max_conversations: max_conversations || 1000,
        max_whatsapp_numbers: max_whatsapp_numbers || 1,
        features: features || [],
        is_active: is_active ?? true,
        sort_order: sort_order || 1,
        stripe_price_id: stripe_price_id || null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
