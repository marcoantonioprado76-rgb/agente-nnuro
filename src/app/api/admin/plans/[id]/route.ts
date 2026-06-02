import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'

const EDITABLE_FIELDS = [
  'name', 'slug', 'description',
  'price', 'currency',
  'monthly_price', 'quarterly_price', 'annual_price',
  'quarterly_full_price', 'annual_full_price',
  'quarterly_discount_amount', 'annual_discount_amount',
  'included_monthly_ai_credits', 'included_monthly_ai_budget_usd', 'credit_usd_conversion_rate',
  'max_ai_agents', 'max_virtual_stores', 'max_monthly_contacts', 'max_monthly_conversations', 'max_team_members',
  'max_bots', 'max_products', 'max_conversations', 'max_whatsapp_numbers',
  'promotion_label', 'promotion_start_date', 'promotion_end_date', 'is_promotion_active',
  'is_active', 'is_featured', 'sort_order',
  'show_nuro_branding', 'trial_duration_days',
  'features',
  'stripe_price_id', 'stripe_quarterly_price_id', 'stripe_annual_price_id',
] as const

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

    for (const field of EDITABLE_FIELDS) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    // Mirroring: si actualizan monthly_price y no mandan price, sincronizar para compat
    if (body.monthly_price !== undefined && body.price === undefined) {
      updateData.price = body.monthly_price
    }
    // y al revés
    if (body.price !== undefined && body.monthly_price === undefined) {
      updateData.monthly_price = body.price
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 })
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
  } catch (e) {
    console.error('[PUT /api/admin/plans/:id] error:', e)
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
  } catch (e) {
    console.error('[DELETE /api/admin/plans/:id] error:', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
