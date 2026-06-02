import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/credit-movements
 * Auditoría completa del ledger con filtros opcionales.
 *
 * Query params:
 *   - limit:    1..200 (default 50)
 *   - offset:   0..    (default 0)
 *   - type:     movement_type
 *   - user_id:  filtrar por usuario
 *   - from:     ISO date (lower bound created_at)
 *   - to:       ISO date (upper bound created_at)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (session.role !== 'admin') return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

    const url = new URL(req.url)
    const limitRaw = Number(url.searchParams.get('limit') ?? 50)
    const offsetRaw = Number(url.searchParams.get('offset') ?? 0)
    const limit = Math.max(1, Math.min(200, Number.isFinite(limitRaw) ? limitRaw : 50))
    const offset = Math.max(0, Number.isFinite(offsetRaw) ? offsetRaw : 0)
    const type = url.searchParams.get('type')
    const userId = url.searchParams.get('user_id')
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')

    const service = await createServiceRoleClient()

    let query = service
      .from('credit_movements')
      .select(
        'id, user_id, movement_type, amount, balance_before, balance_after, source, description, related_subscription_id, related_ai_usage_log_id, related_package_id, idempotency_key, created_at',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (type) query = query.eq('movement_type', type)
    if (userId) query = query.eq('user_id', userId)
    if (from) query = query.gte('created_at', from)
    if (to) query = query.lte('created_at', to)

    const { data, error, count } = await query
    if (error) {
      console.error('[GET /api/admin/credit-movements] supabase error:', error)
      return NextResponse.json({ error: 'Error consultando movimientos' }, { status: 500 })
    }

    // Adjuntar el email del usuario (cuando hay user_id) para mostrar en la UI
    const userIds = Array.from(new Set((data ?? []).map(m => m.user_id))).filter(Boolean)
    const userMap = new Map<string, { email: string | null; full_name: string | null }>()
    if (userIds.length > 0) {
      const { data: profiles } = await service
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds)
      for (const p of profiles ?? []) {
        userMap.set(p.id, { email: p.email, full_name: p.full_name })
      }
    }

    const enriched = (data ?? []).map((m) => ({
      ...m,
      user: userMap.get(m.user_id) ?? { email: null, full_name: null },
    }))

    return NextResponse.json({
      movements: enriched,
      pagination: {
        total: count ?? 0,
        limit,
        offset,
        hasMore: (count ?? 0) > offset + (data?.length ?? 0),
      },
    })
  } catch (e) {
    console.error('[GET /api/admin/credit-movements] error:', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
