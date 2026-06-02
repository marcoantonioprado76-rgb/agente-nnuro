import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/credits/movements
 * Devuelve los movimientos del ledger del usuario actual con paginación.
 *
 * Query params:
 *   - limit: 1..100  (default 50)
 *   - offset: 0..    (default 0)
 *   - type:   opcional, uno de los movement_type válidos
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const url = new URL(req.url)
    const limitRaw = Number(url.searchParams.get('limit') ?? 50)
    const offsetRaw = Number(url.searchParams.get('offset') ?? 0)
    const limit = Math.max(1, Math.min(100, Number.isFinite(limitRaw) ? limitRaw : 50))
    const offset = Math.max(0, Number.isFinite(offsetRaw) ? offsetRaw : 0)
    const type = url.searchParams.get('type')

    const service = await createServiceRoleClient()

    let query = service
      .from('credit_movements')
      .select(
        'id, movement_type, amount, balance_before, balance_after, source, description, related_subscription_id, related_ai_usage_log_id, related_package_id, created_at',
        { count: 'exact' }
      )
      .eq('user_id', session.sub)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (type) query = query.eq('movement_type', type)

    const { data, error, count } = await query
    if (error) {
      console.error('[GET /api/credits/movements] supabase error:', error)
      return NextResponse.json({ error: 'Error consultando movimientos' }, { status: 500 })
    }

    return NextResponse.json({
      movements: data ?? [],
      pagination: {
        total: count ?? 0,
        limit,
        offset,
        hasMore: (count ?? 0) > offset + (data?.length ?? 0),
      },
    })
  } catch (error) {
    console.error('[GET /api/credits/movements] Error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
