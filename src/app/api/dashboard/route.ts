import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const tenantId = session.tenant_id ?? session.sub

    const { data: bots } = await db.from('bots').select('id, name, status').eq('tenant_id', tenantId)
    const botIds = (bots || []).map((b: any) => b.id)

    const [botsRes, activeBotsRes, productsRes, conversationsRes, soldRes] = await Promise.all([
      db.from('bots').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
      db.from('bots').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'ACTIVE'),
      db.from('products').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
      botIds.length > 0
        ? db.from('conversations').select('id', { count: 'exact', head: true }).in('bot_id', botIds)
        : Promise.resolve({ count: 0 }),
      botIds.length > 0
        ? db.from('conversations').select('id', { count: 'exact', head: true }).in('bot_id', botIds).eq('sold', true)
        : Promise.resolve({ count: 0 }),
    ])

    let recentConversations: any[] = []
    if (botIds.length > 0) {
      const { data: convs } = await db
        .from('conversations')
        .select('id, bot_id, user_phone, user_name, sold, bot_disabled, updated_at')
        .in('bot_id', botIds)
        .order('updated_at', { ascending: false })
        .limit(5)
      const botMap: Record<string, string> = {}
      ;(bots || []).forEach((b: any) => { botMap[b.id] = b.name })
      recentConversations = (convs || []).map((c: any) => ({ ...c, bot_name: botMap[c.bot_id] || 'Bot' }))
    }

    return NextResponse.json({
      total_bots: botsRes.count || 0,
      active_bots: activeBotsRes.count || 0,
      total_products: productsRes.count || 0,
      total_conversations: conversationsRes.count || 0,
      total_sales: soldRes.count || 0,
      recent_conversations: recentConversations,
      bots: bots || [],
    })
  } catch (error) {
    console.error('[dashboard]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
