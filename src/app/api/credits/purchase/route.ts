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
        .select('ai_credits_usd')
        .eq('id', session.sub)
        .single(),
      service
        .from('credit_purchases')
        .select('id, amount_usd, status, stripe_checkout_session_id, created_at, completed_at')
        .eq('user_id', session.sub)
        .order('created_at', { ascending: false })
        .limit(30),
    ])

    return NextResponse.json({
      balance_usd: Number(profile?.ai_credits_usd ?? 0),
      purchases: purchases ?? [],
    })
  } catch (error) {
    console.error('[GET /api/credits/purchase] Error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
