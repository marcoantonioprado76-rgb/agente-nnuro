import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params
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

    // Get the order and verify tenant
    const { data: order } = await supabase
      .from('orders')
      .select('id, bot_id, contact_id, tenant_id')
      .eq('id', orderId)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (!order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    }

    // Find the conversation for this order's bot + contact
    const { data: convArr } = await supabase
      .from('conversations')
      .select('id')
      .eq('bot_id', order.bot_id)
      .eq('contact_id', order.contact_id)
      .order('last_message_at', { ascending: false })
      .limit(1)
    const conversation = convArr?.[0] || null

    if (!conversation) {
      return NextResponse.json([])
    }

    // Get messages
    const { data: messages, error } = await supabase
      .from('messages')
      .select('id, sender, type, content, created_at')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true })
      .limit(200)

    if (error) {
      return NextResponse.json({ error: 'Error al obtener mensajes' }, { status: 500 })
    }

    return NextResponse.json(messages || [])
  } catch (error) {
    console.error('Error en GET /api/orders/[id]/messages:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
