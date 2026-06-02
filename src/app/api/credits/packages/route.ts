import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/credits/packages
 * Lista paquetes activos para que el usuario los compre desde /wallet.
 */
export async function GET() {
  try {
    const session = await getServerSession()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const service = await createServiceRoleClient()
    const { data, error } = await service
      .from('credit_packages')
      .select('id, name, credits_amount, price_usd, expiration_days, description, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('price_usd', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data || [])
  } catch (e) {
    console.error('[GET /api/credits/packages] error:', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
