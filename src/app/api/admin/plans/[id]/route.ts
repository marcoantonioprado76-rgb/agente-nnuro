import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'


// PUT - update a plan
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (session.role !== 'admin') return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

    const body = await request.json()
    const service = await createServiceRoleClient()

    const updateData: Record<string, unknown> = {}
    const fields = ['name', 'slug', 'price', 'currency', 'max_bots', 'max_products', 'max_conversations', 'max_whatsapp_numbers', 'features', 'is_active', 'sort_order', 'stripe_price_id']

    for (const field of fields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    const { data, error } = await service
      .from('plans')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// DELETE - delete a plan
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (session.role !== 'admin') return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

    const service = await createServiceRoleClient()

    // Check if plan has active subscriptions
    const { data: subs } = await service
      .from('subscriptions')
      .select('id')
      .eq('plan_id', id)
      .in('status', ['active', 'pending'])
      .limit(1)

    if (subs && subs.length > 0) {
      return NextResponse.json({ error: 'No se puede eliminar un plan con suscripciones activas. Desactívalo en su lugar.' }, { status: 400 })
    }

    const { error } = await service
      .from('plans')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
