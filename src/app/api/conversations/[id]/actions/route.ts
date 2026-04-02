import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

async function verifyAccess(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, userId: string, convId: string) {
  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', userId).single()
  if (!profile) return false

  const service = await createServiceRoleClient()
  const { data: conv } = await service
    .from('conversations')
    .select('id, bot_id, bots(tenant_id)')
    .eq('id', convId)
    .single()

  if (!conv) return false
  const tenantId = (conv.bots as unknown as { tenant_id: string })?.tenant_id
  return tenantId === profile.tenant_id
}

// PATCH /api/conversations/[id]/actions
// Actions: pause_bot, resume_bot, clear_memory
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const hasAccess = await verifyAccess(supabase, user.id, id)
    if (!hasAccess) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { action } = await request.json()
    const service = await createServiceRoleClient()

    switch (action) {
      case 'pause_bot': {
        // Set conversation status to 'paused' — bot will skip this contact
        await service
          .from('conversations')
          .update({ status: 'paused', updated_at: new Date().toISOString() })
          .eq('id', id)
        return NextResponse.json({ success: true, message: 'Bot pausado para este contacto' })
      }

      case 'resume_bot': {
        // Reactivate conversation
        await service
          .from('conversations')
          .update({ status: 'active', updated_at: new Date().toISOString() })
          .eq('id', id)
        return NextResponse.json({ success: true, message: 'Bot reactivado para este contacto' })
      }

      case 'clear_memory': {
        // Clear product_interest (AI memory) for this conversation
        await service
          .from('conversations')
          .update({ product_interest: null, updated_at: new Date().toISOString() })
          .eq('id', id)
        return NextResponse.json({ success: true, message: 'Memoria del contacto eliminada' })
      }

      default:
        return NextResponse.json({ error: 'Accion no valida' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error en PATCH /api/conversations/[id]/actions:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
