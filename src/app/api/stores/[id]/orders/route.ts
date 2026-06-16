import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/** Lista los pedidos de una tienda del usuario autenticado. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const service = await createServiceRoleClient()

    // Verificar que la tienda pertenece al usuario.
    const { data: store } = await service
      .from('stores')
      .select('id')
      .eq('id', id)
      .eq('user_id', session.sub)
      .single()
    if (!store) return NextResponse.json({ error: 'Tienda no encontrada' }, { status: 404 })

    const limit = Math.min(100, parseInt(request.nextUrl.searchParams.get('limit') || '50', 10))

    const { data: orders, error } = await service
      .from('store_orders')
      .select('id, customer_name, customer_phone, customer_city, customer_address, reference, payment_method, items, subtotal, total, currency, status, notes, created_at')
      .eq('store_id', id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error obteniendo pedidos:', error)
      return NextResponse.json({ error: 'Error al obtener pedidos' }, { status: 500 })
    }

    return NextResponse.json({ orders: orders || [] })
  } catch (error) {
    console.error('Error en GET /api/stores/[id]/orders:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

/** Cambia el estado de un pedido (pending → confirmed → shipped → delivered → cancelled). */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json().catch(() => ({})) as { orderId?: string; status?: string }
    const VALID = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']
    if (!body.orderId || !body.status || !VALID.includes(body.status)) {
      return NextResponse.json({ error: 'orderId y status válidos requeridos' }, { status: 400 })
    }

    const service = await createServiceRoleClient()

    // Verificar ownership de la tienda.
    const { data: store } = await service
      .from('stores')
      .select('id')
      .eq('id', id)
      .eq('user_id', session.sub)
      .single()
    if (!store) return NextResponse.json({ error: 'Tienda no encontrada' }, { status: 404 })

    const { error } = await service
      .from('store_orders')
      .update({ status: body.status, updated_at: new Date().toISOString() })
      .eq('id', body.orderId)
      .eq('store_id', id)
    if (error) {
      console.error('Error actualizando pedido:', error)
      return NextResponse.json({ error: 'Error al actualizar pedido' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error en PATCH /api/stores/[id]/orders:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
