import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { getServerSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * Campos editables del plan. Incluye:
 *  - identificación: name, slug
 *  - precios por periodo: monthly_price, quarterly_price, annual_price
 *  - precios "full" (sin descuento, para tachados): quarterly_full_price, annual_full_price
 *  - descuentos directos en USD: quarterly_discount_amount, annual_discount_amount
 *  - créditos: included_monthly_ai_credits, included_monthly_ai_budget_usd, credit_usd_conversion_rate
 *  - límites: max_ai_agents, max_virtual_stores, max_monthly_contacts, max_monthly_conversations, max_team_members
 *  - límites legacy (compat): max_bots, max_products, max_conversations, max_whatsapp_numbers
 *  - promoción: promotion_label, promotion_start_date, promotion_end_date, is_promotion_active
 *  - flags: is_active, is_featured, show_nuro_branding
 *  - trial: trial_duration_days
 *  - Stripe: stripe_price_id, stripe_quarterly_price_id, stripe_annual_price_id
 *  - misc: currency, features, sort_order, description
 */
// GET all plans (including inactive)
export async function GET() {
  try {
    const session = await getServerSession()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (session.role !== 'admin') return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

    const service = await createServiceRoleClient()
    const { data, error } = await service
      .from('plans')
      .select('*')
      .order('sort_order')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data || [])
  } catch (e) {
    console.error('[GET /api/admin/plans] error:', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// POST - create a new plan
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (session.role !== 'admin') return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

    const body = await request.json()
    if (!body?.name || !body?.slug) {
      return NextResponse.json({ error: 'Nombre y slug son requeridos' }, { status: 400 })
    }

    // Validación: si monthly_price no viene, intentamos copiar de price
    const monthlyPrice = body.monthly_price ?? body.price ?? 0

    const insertData: Record<string, unknown> = {
      id: randomUUID(),
      name: body.name,
      slug: body.slug,
      description: body.description ?? null,
      price: body.price ?? monthlyPrice,
      currency: body.currency || 'USD',
      monthly_price: monthlyPrice,
      quarterly_price: body.quarterly_price ?? null,
      annual_price: body.annual_price ?? null,
      quarterly_full_price: body.quarterly_full_price ?? null,
      annual_full_price: body.annual_full_price ?? null,
      quarterly_discount_amount: body.quarterly_discount_amount ?? null,
      annual_discount_amount: body.annual_discount_amount ?? null,

      included_monthly_ai_credits: body.included_monthly_ai_credits ?? 0,
      included_monthly_ai_budget_usd: body.included_monthly_ai_budget_usd ?? 0,
      credit_usd_conversion_rate: body.credit_usd_conversion_rate ?? 100,

      max_ai_agents: body.max_ai_agents ?? body.max_bots ?? null,
      max_virtual_stores: body.max_virtual_stores ?? 1,
      max_monthly_contacts: body.max_monthly_contacts ?? 0,
      max_monthly_conversations: body.max_monthly_conversations ?? body.max_conversations ?? null,
      max_team_members: body.max_team_members ?? 1,

      // legacy compat
      max_bots: body.max_bots ?? body.max_ai_agents ?? 1,
      max_products: body.max_products ?? 5,
      max_conversations: body.max_conversations ?? body.max_monthly_conversations ?? 1000,
      max_whatsapp_numbers: body.max_whatsapp_numbers ?? 1,

      features: body.features || [],
      is_active: body.is_active ?? true,
      is_featured: body.is_featured ?? false,
      sort_order: body.sort_order ?? 1,

      promotion_label: body.promotion_label ?? null,
      promotion_start_date: body.promotion_start_date ?? null,
      promotion_end_date: body.promotion_end_date ?? null,
      is_promotion_active: body.is_promotion_active ?? false,

      show_nuro_branding: body.show_nuro_branding ?? true,
      trial_duration_days: body.trial_duration_days ?? null,

      stripe_price_id: body.stripe_price_id ?? null,
      stripe_quarterly_price_id: body.stripe_quarterly_price_id ?? null,
      stripe_annual_price_id: body.stripe_annual_price_id ?? null,
    }

    const service = await createServiceRoleClient()
    const { data, error } = await service
      .from('plans')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    console.error('[POST /api/admin/plans] error:', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
