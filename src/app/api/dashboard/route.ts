import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const session = await getServerSession()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const tenantId = session.tenant_id ?? session.sub

    // Fetch tenant bots first (needed for conversations count)
    const { data: bots } = await db
      .from('bots')
      .select('id, name')
      .eq('tenant_id', tenantId)

    const botIds = bots?.map(b => b.id) || []

    // Fetch counts in parallel
    const [botsRes, activeBotsRes, productsRes, conversationsRes, leadsRes, ordersRes] = await Promise.all([
      db.from('bots').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
      db.from('bots').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('is_active', true),
      db.from('products').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
      botIds.length > 0
        ? db.from('conversations').select('id', { count: 'exact', head: true }).in('bot_id', botIds)
        : Promise.resolve({ count: 0 }),
      db.from('leads').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
      db.from('orders').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'confirmed'),
    ])
    const botNameMap: Record<string, string> = {}
    bots?.forEach(b => { botNameMap[b.id] = b.name })

    let recentConversations: Array<Record<string, unknown>> = []
    if (botIds.length > 0) {
      const { data: convs } = await db
        .from('conversations')
        .select('id, bot_id, status, last_message_at, contact_id, contacts(name, push_name, phone)')
        .in('bot_id', botIds)
        .order('last_message_at', { ascending: false })
        .limit(5)

      recentConversations = (convs || []).map(c => ({
        ...c,
        bot_name: botNameMap[c.bot_id] || 'Bot',
      }))
    }

    // Quick bots summary
    const quickBots = (bots || []).map(b => ({
      id: b.id,
      name: b.name,
    }))

    return NextResponse.json({
      total_bots: botsRes.count || 0,
      active_bots: activeBotsRes.count || 0,
      total_products: productsRes.count || 0,
      total_conversations: conversationsRes.count || 0,
      total_leads: leadsRes.count || 0,
      confirmed_orders: ordersRes.count || 0,
      recent_conversations: recentConversations,
      bots: quickBots,
    })
  } catch (error) {
    console.error('Error en GET /api/dashboard:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
