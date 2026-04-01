import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: storeId } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const service = await createServiceRoleClient()

    const { data: products, error } = await service
      .from('store_products')
      .select('*, store_product_images(*)')
      .eq('store_id', storeId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching store products:', error)
      return NextResponse.json({ error: 'Error al obtener productos' }, { status: 500 })
    }

    return NextResponse.json(products)
  } catch (error) {
    console.error('Error en GET /api/stores/[id]/products:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: storeId } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
    }

    const service = await createServiceRoleClient()

    // Verify store ownership
    const { data: store } = await service
      .from('stores')
      .select('id')
      .eq('id', storeId)
      .eq('user_id', user.id)
      .single()

    if (!store) {
      return NextResponse.json({ error: 'Tienda no encontrada' }, { status: 404 })
    }

    const body = await request.json()
    const { name, category, currency, price, stock, description, images } = body

    if (!name) {
      return NextResponse.json({ error: 'El nombre del producto es requerido' }, { status: 400 })
    }

    // Create product
    const { data: product, error } = await service
      .from('store_products')
      .insert({
        store_id: storeId,
        user_id: user.id,
        tenant_id: profile.tenant_id,
        name: name.trim(),
        category: category || 'General',
        currency: currency || 'USD',
        price: price || 0,
        stock: stock || 0,
        description: description?.trim() || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating store product:', error)
      return NextResponse.json({ error: 'Error al crear el producto' }, { status: 500 })
    }

    // Insert images if provided
    if (images && Array.isArray(images) && images.length > 0) {
      const imageRows = images
        .filter((url: string) => url && url.trim())
        .map((url: string, i: number) => ({
          product_id: product.id,
          image_url: url.trim(),
          sort_order: i,
        }))

      if (imageRows.length > 0) {
        await service.from('store_product_images').insert(imageRows)
      }
    }

    // Re-fetch with images
    const { data: fullProduct } = await service
      .from('store_products')
      .select('*, store_product_images(*)')
      .eq('id', product.id)
      .single()

    return NextResponse.json(fullProduct, { status: 201 })
  } catch (error) {
    console.error('Error en POST /api/stores/[id]/products:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
