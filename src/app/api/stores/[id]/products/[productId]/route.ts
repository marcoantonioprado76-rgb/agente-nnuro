import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; productId: string }> }
) {
  try {
    const { productId } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const service = await createServiceRoleClient()

    // Verify ownership
    const { data: existing } = await service
      .from('store_products')
      .select('id')
      .eq('id', productId)
      .eq('user_id', user.id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    }

    const body = await request.json()
    const { images, ...productFields } = body

    productFields.updated_at = new Date().toISOString()

    const { data: product, error } = await service
      .from('store_products')
      .update(productFields)
      .eq('id', productId)
      .select()
      .single()

    if (error) {
      console.error('Error updating store product:', error)
      return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
    }

    // Update images if provided
    if (images !== undefined && Array.isArray(images)) {
      // Delete old images
      await service.from('store_product_images').delete().eq('product_id', productId)

      // Insert new ones
      const imageRows = images
        .filter((url: string) => url && url.trim())
        .map((url: string, i: number) => ({
          product_id: productId,
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
      .eq('id', productId)
      .single()

    return NextResponse.json(fullProduct)
  } catch (error) {
    console.error('Error en PUT /api/stores/[id]/products/[productId]:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; productId: string }> }
) {
  try {
    const { productId } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const service = await createServiceRoleClient()

    const { data: existing } = await service
      .from('store_products')
      .select('id')
      .eq('id', productId)
      .eq('user_id', user.id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    }

    const { error } = await service.from('store_products').delete().eq('id', productId)

    if (error) {
      console.error('Error deleting store product:', error)
      return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Producto eliminado' })
  } catch (error) {
    console.error('Error en DELETE /api/stores/[id]/products/[productId]:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
