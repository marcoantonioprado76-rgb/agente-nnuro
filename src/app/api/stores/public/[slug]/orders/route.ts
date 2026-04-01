import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { createUserNotification } from '@/lib/notifications'

// Public endpoint - no auth required (customers placing orders)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const service = await createServiceRoleClient()

    // Find the store
    const { data: store, error: storeError } = await service
      .from('stores')
      .select('id, user_id, tenant_id, name, whatsapp_number')
      .eq('slug', slug)
      .eq('visibility', 'public')
      .eq('is_active', true)
      .single()

    if (storeError || !store) {
      return NextResponse.json({ error: 'Tienda no encontrada' }, { status: 404 })
    }

    const body = await request.json()
    const {
      products,
      total,
      currency,
      customer_name,
      customer_phone,
      city,
      address,
      reference,
      payment_method,
      latitude,
      longitude,
      google_maps_url,
    } = body

    if (!customer_name || !customer_phone || !products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
    }

    // Build order details as JSON in the notes field
    const orderDetails: Record<string, unknown> = {
      city: city || '',
      address: address || '',
      reference: reference || '',
      payment_method: payment_method || 'whatsapp',
      products: products.map((p: { name: string; quantity: number; price: number; id?: string }) => ({
        id: p.id,
        name: p.name,
        quantity: p.quantity,
        price: p.price,
      })),
    }

    // Add location data if provided
    if (latitude) orderDetails.latitude = latitude
    if (longitude) orderDetails.longitude = longitude
    if (google_maps_url) orderDetails.google_maps_url = google_maps_url

    const { data: order, error: orderError } = await service
      .from('store_orders')
      .insert({
        store_id: store.id,
        user_id: store.user_id,
        tenant_id: store.tenant_id,
        customer_name: customer_name.trim(),
        customer_phone: customer_phone.trim(),
        quantity: products.reduce((sum: number, p: { quantity: number }) => sum + p.quantity, 0),
        amount: total || 0,
        currency: currency || 'USD',
        status: 'pending',
        source: 'web',
        notes: JSON.stringify(orderDetails),
        ...(latitude ? { latitude: Number(latitude) } : {}),
        ...(longitude ? { longitude: Number(longitude) } : {}),
        ...(google_maps_url ? { google_maps_url } : {}),
      })
      .select()
      .single()

    if (orderError) {
      console.error('Error creating order:', orderError)
      return NextResponse.json({ error: 'Error al crear pedido' }, { status: 500 })
    }

    // Notify store owner about new order (non-blocking)
    createUserNotification({
      userId: store.user_id,
      type: 'venta_confirmada',
      title: 'Nuevo pedido recibido',
      message: `${customer_name} realizó un pedido por $${total || 0} ${currency || 'USD'} en tu tienda "${store.name}".`,
      link: '/sales',
      metadata: { order_id: order.id, store_id: store.id },
    }).catch(() => {})

    return NextResponse.json({ order, store_name: store.name }, { status: 201 })
  } catch (error) {
    console.error('Error en POST /api/stores/public/[slug]/orders:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
