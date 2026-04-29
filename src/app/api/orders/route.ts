import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const tenantId = session.tenant_id ?? session.sub
    const limit = Math.min(100, parseInt(request.nextUrl.searchParams.get('limit') || '50'))

    // Get user's bots
    const { data: bots } = await db.from('bots').select('id, name').eq('tenant_id', tenantId)
    const botIds = (bots || []).map((b: any) => b.id)
    const botMap: Record<string, string> = {}
    ;(bots || []).forEach((b: any) => { botMap[b.id] = b.name })

    if (botIds.length === 0) return NextResponse.json({ orders: [], total: 0 })

    // Get sold conversations
    const { data: convs, count } = await db
      .from('conversations')
      .select('id, bot_id, user_phone, user_name, sold, sold_at, updated_at, created_at', { count: 'exact' })
      .in('bot_id', botIds)
      .eq('sold', true)
      .order('sold_at', { ascending: false })
      .limit(limit)

    const orders = (convs || []).map((c: any) => ({
      id: c.id,
      bot_id: c.bot_id,
      status: 'confirmed',
      created_at: c.sold_at || c.updated_at,
      total_amount: 0,
      currency: 'USD',
      shipping_address: null,
      notes: null,
      contacts: { name: c.user_name, phone: c.user_phone },
      products: null,
      bots: { name: botMap[c.bot_id] || 'Bot' },
    }))

    return NextResponse.json({ orders, total: count || 0 })
  } catch (err) {
    console.error('[orders]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
