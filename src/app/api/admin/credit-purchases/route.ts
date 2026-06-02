import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/credit-purchases
 * Lista todas las compras de créditos con datos del usuario.
 * Admin-only.
 *
 * Query params:
 *   status?: 'pending' | 'completed' | 'failed' | 'expired' | 'all'  (default all)
 *   limit?: number  (default 100, max 500)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const status = request.nextUrl.searchParams.get('status') || 'all'
    const limitRaw = Number(request.nextUrl.searchParams.get('limit') || 100)
    const limit = Math.min(500, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 100))

    const service = await createServiceRoleClient()

    let query = service
      .from('credit_purchases')
      .select(`
        id,
        user_id,
        amount_usd,
        status,
        stripe_checkout_session_id,
        stripe_payment_intent_id,
        notes,
        created_at,
        completed_at,
        updated_at,
        user:profiles!credit_purchases_user_fk(id, email, full_name, role, ai_credits_usd)
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('[GET /api/admin/credit-purchases] supabase error:', error)
      return NextResponse.json(
        { error: `Error al consultar compras: ${error.message}` },
        { status: 500 }
      )
    }

    // Métricas resumidas
    const [{ count: pendingCount }, { count: completedCount }, { data: totalSums }] = await Promise.all([
      service.from('credit_purchases').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      service.from('credit_purchases').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
      service.from('credit_purchases').select('amount_usd').eq('status', 'completed'),
    ])
    const totalCompletedUsd = (totalSums ?? []).reduce(
      (acc, row) => acc + Number(row.amount_usd ?? 0),
      0
    )

    return NextResponse.json({
      purchases: data ?? [],
      stats: {
        pending: pendingCount ?? 0,
        completed: completedCount ?? 0,
        total_completed_usd: Number(totalCompletedUsd.toFixed(2)),
      },
    })
  } catch (err) {
    console.error('[GET /api/admin/credit-purchases]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
