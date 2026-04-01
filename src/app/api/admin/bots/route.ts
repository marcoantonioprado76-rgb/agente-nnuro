import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const service = await createServiceRoleClient()

    // Obtener todos los bots con info del tenant
    const { data: bots, error } = await service
      .from('bots')
      .select('*, tenants:tenant_id(name)')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Error al obtener bots' }, { status: 500 })
    }

    // Obtener sesiones de WhatsApp para mostrar estado
    const botIds = (bots || []).map(b => b.id)
    const { data: sessions } = await service
      .from('whatsapp_sessions')
      .select('bot_id, status, phone_number')
      .in('bot_id', botIds.length > 0 ? botIds : ['none'])

    const sessionsMap = new Map(
      (sessions || []).map(s => [s.bot_id, s])
    )

    const botsWithSessions = (bots || []).map(bot => ({
      ...bot,
      whatsapp_status: sessionsMap.get(bot.id)?.status || 'disconnected',
      whatsapp_phone: sessionsMap.get(bot.id)?.phone_number || null,
    }))

    return NextResponse.json(botsWithSessions)
  } catch (error) {
    console.error('Error en GET /api/admin/bots:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
