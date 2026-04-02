import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

// DELETE /api/bots/[id]/clear-memory — clear all conversation memories for a bot
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verify bot belongs to user's tenant
    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
    if (!profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

    const service = await createServiceRoleClient()
    const { data: bot } = await service.from('bots').select('tenant_id').eq('id', id).single()
    if (!bot || bot.tenant_id !== profile.tenant_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Clear product_interest from all conversations of this bot
    const { data: updated, error } = await service
      .from('conversations')
      .update({ product_interest: null, updated_at: new Date().toISOString() })
      .eq('bot_id', id)
      .not('product_interest', 'is', null)
      .select('id')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Memoria eliminada de ${updated?.length || 0} conversaciones`,
      cleared: updated?.length || 0,
    })
  } catch (error) {
    console.error('Error en DELETE /api/bots/[id]/clear-memory:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
