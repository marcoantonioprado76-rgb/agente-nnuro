import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/credits/purchase
 * Devuelve el balance actual del usuario + las últimas 30 compras.
 */
export async function GET() {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const service = await createServiceRoleClient()

    const [{ data: profile }, { data: purchases }] = await Promise.all([
      service
        .from('profiles')
        .select('ai_credits_usd, included_credits_balance, additional_credits_balance, credits_used_current_cycle, last_credit_recharge_date, next_credit_recharge_date')
        .eq('id', session.sub)
        .single(),
      service
        .from('credit_purchases')
        .select('id, amount_usd, status, stripe_checkout_session_id, created_at, completed_at')
        .eq('user_id', session.sub)
        .order('created_at', { ascending: false })
        .limit(30),
    ])

    const included = Number(profile?.included_credits_balance ?? 0)
    const additional = Number(profile?.additional_credits_balance ?? 0)

    return NextResponse.json({
      // Legacy USD balance — mantener por compatibilidad con el widget viejo
      balance_usd: Number(profile?.ai_credits_usd ?? 0),
      // Nuevo modelo de créditos
      credits: {
        included,
        additional,
        total: included + additional,
        used_current_cycle: Number(profile?.credits_used_current_cycle ?? 0),
        last_recharge_date: profile?.last_credit_recharge_date ?? null,
        next_recharge_date: profile?.next_credit_recharge_date ?? null,
      },
      purchases: purchases ?? [],
    })
  } catch (error) {
    console.error('[GET /api/credits/purchase] Error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
