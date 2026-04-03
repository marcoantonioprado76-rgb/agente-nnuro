import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

async function isAdmin(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin'
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    if (!(await isAdmin(supabase))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const service = await createServiceRoleClient()

    // Delete store products, orders, then store
    await service.from('store_product_images').delete().in(
      'store_product_id',
      (await service.from('store_products').select('id').eq('store_id', id)).data?.map(p => p.id) || []
    )
    await service.from('store_products').delete().eq('store_id', id)
    await service.from('store_orders').delete().eq('store_id', id)
    const { error } = await service.from('stores').delete().eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    if (!(await isAdmin(supabase))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json()
    const service = await createServiceRoleClient()
    const { data, error } = await service.from('stores').update(body).eq('id', id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
