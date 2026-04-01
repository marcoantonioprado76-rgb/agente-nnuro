import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
    }

    // Pagination params
    const url = request.nextUrl
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50')))
    const offset = (page - 1) * limit

    // Get total count for pagination metadata
    const { count: totalCount } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', profile.tenant_id)

    const { data: orders, error } = await supabase
      .from('orders')
      .select('*, contacts(id, name, push_name, phone), products(id, name, price_unit, currency), bots(id, name, report_phone)')
      .eq('tenant_id', profile.tenant_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error al obtener ordenes:', error)
      return NextResponse.json({ error: 'Error al obtener las ventas' }, { status: 500 })
    }

    // Batch conversation lookup: collect unique (bot_id, contact_id) pairs
    // and fetch conversations in a single query instead of N+1
    if (orders && orders.length > 0) {
      // If orders have conversation_id stored directly, use it
      // Otherwise, batch-fetch conversations for all bot+contact pairs
      const ordersMissingConv = orders.filter(o => !(o as Record<string, unknown>).conversation_id)

      if (ordersMissingConv.length > 0) {
        // Get unique bot_id+contact_id pairs
        const pairs = new Set(ordersMissingConv.map(o => `${o.bot_id}:${o.contact_id}`))
        const uniquePairs = Array.from(pairs).map(p => {
          const [botId, contactId] = p.split(':')
          return { botId, contactId }
        })

        // Fetch all relevant conversations in one query using .or()
        const orFilter = uniquePairs
          .map(p => `and(bot_id.eq.${p.botId},contact_id.eq.${p.contactId})`)
          .join(',')

        const { data: conversations } = await supabase
          .from('conversations')
          .select('id, bot_id, contact_id, product_interest, last_message_at')
          .or(orFilter)
          .order('last_message_at', { ascending: false })

        // Build a map of latest conversation per bot+contact pair
        const convMap = new Map<string, { id: string; product_interest: string | null }>()
        if (conversations) {
          for (const conv of conversations) {
            const key = `${conv.bot_id}:${conv.contact_id}`
            if (!convMap.has(key)) {
              convMap.set(key, { id: conv.id, product_interest: conv.product_interest })
            }
          }
        }

        for (const order of orders) {
          if (!(order as Record<string, unknown>).conversation_id) {
            const conv = convMap.get(`${order.bot_id}:${order.contact_id}`)
            ;(order as Record<string, unknown>).conversation_id = conv?.id || null
            ;(order as Record<string, unknown>).conversation_summary = conv?.product_interest || null
          }
        }
      }
    }

    return NextResponse.json({
      data: orders,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit),
      },
    })
  } catch (error) {
    console.error('Error en GET /api/orders:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
