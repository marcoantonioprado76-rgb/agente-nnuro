import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { createUserNotification } from '@/lib/notifications'

const CURRENCY_SYMBOL: Record<string, string> = {
  USD: '$', EUR: '€', BOB: 'Bs.', PEN: 'S/', COP: '$', ARS: '$', MXN: '$', CLP: '$',
}

// Endpoint público — sin auth (clientes haciendo pedidos en la tienda).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const service = await createServiceRoleClient()

    // 1. Tienda pública y activa
    const { data: store, error: storeError } = await service
      .from('stores')
      .select('id, user_id, tenant_id, name')
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

    if (!customer_name || !customer_phone || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
    }

    // 2. Normalizar lo pedido: SOLO id + cantidad. El precio del cliente se ignora.
    const requested = (products as Array<{ id?: string; quantity?: number }>)
      .map((p) => ({ id: String(p.id ?? ''), quantity: Math.max(1, Math.floor(Number(p.quantity) || 0)) }))
      .filter((p) => p.id && p.quantity > 0)
    if (requested.length === 0) {
      return NextResponse.json({ error: 'Productos inválidos' }, { status: 400 })
    }

    // 3. Cargar los productos REALES de la tienda (precio y stock desde la BD).
    const ids = requested.map((p) => p.id)
    const { data: dbProducts, error: prodErr } = await service
      .from('store_products')
      .select('id, name, price, currency, stock, is_active')
      .eq('store_id', store.id)
      .in('id', ids)

    if (prodErr) {
      console.error('Error validando productos:', prodErr)
      return NextResponse.json({ error: 'Error al validar productos' }, { status: 500 })
    }

    const byId = new Map((dbProducts || []).map((p) => [p.id as string, p]))

    // 4. Validar cada item y calcular el total EN EL SERVIDOR (anti-manipulación de precios).
    let subtotal = 0
    let currency = 'USD'
    const items: Array<{ id: string; name: string; quantity: number; price: number; lineTotal: number }> = []

    for (const req of requested) {
      const prod = byId.get(req.id) as { id: string; name: string; price: number; currency?: string; stock?: number | null; is_active?: boolean } | undefined
      if (!prod || prod.is_active === false) {
        return NextResponse.json({ error: 'Uno de los productos ya no está disponible' }, { status: 400 })
      }
      if (prod.stock !== null && prod.stock !== undefined && Number(prod.stock) < req.quantity) {
        return NextResponse.json({ error: `Stock insuficiente para "${prod.name}"` }, { status: 409 })
      }
      const price = Number(prod.price) || 0
      const lineTotal = price * req.quantity
      subtotal += lineTotal
      currency = prod.currency || currency
      items.push({ id: prod.id, name: prod.name, quantity: req.quantity, price, lineTotal })
    }
    const total = subtotal

    // 5. Datos de ubicación (la tabla no tiene columnas lat/lng → van en notes JSON).
    const notesObj: Record<string, unknown> = {}
    if (latitude) notesObj.latitude = Number(latitude)
    if (longitude) notesObj.longitude = Number(longitude)
    if (google_maps_url) notesObj.google_maps_url = String(google_maps_url)
    const notes = Object.keys(notesObj).length ? JSON.stringify(notesObj) : null

    // 6. Insertar el pedido con las columnas REALES de store_orders.
    const nowIso = new Date().toISOString()
    const { data: order, error: orderError } = await service
      .from('store_orders')
      .insert({
        id: randomUUID(),
        store_id: store.id,
        user_id: store.user_id,
        tenant_id: store.tenant_id,
        customer_name: String(customer_name).trim(),
        customer_phone: String(customer_phone).trim(),
        customer_city: city ? String(city).trim() : null,
        customer_address: address ? String(address).trim() : null,
        reference: reference ? String(reference).trim() : null,
        payment_method: payment_method || 'whatsapp',
        items,
        subtotal,
        total,
        currency,
        status: 'pending',
        notes,
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select('id, total, currency')
      .single()

    if (orderError || !order) {
      console.error('Error creando pedido:', orderError)
      return NextResponse.json({ error: 'Error al crear pedido' }, { status: 500 })
    }

    // 7. Notificar al dueño (no bloqueante).
    const sym = CURRENCY_SYMBOL[currency] || ''
    createUserNotification({
      userId: store.user_id,
      type: 'venta_confirmada',
      title: 'Nuevo pedido recibido',
      message: `${String(customer_name).trim()} realizó un pedido por ${sym}${total} ${currency} en tu tienda "${store.name}".`,
      link: `/stores/${store.id}`,
      metadata: { order_id: order.id, store_id: store.id },
    }).catch(() => {})

    return NextResponse.json({ order: { id: order.id, total, currency }, store_name: store.name }, { status: 201 })
  } catch (error) {
    console.error('Error en POST /api/stores/public/[slug]/orders:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
