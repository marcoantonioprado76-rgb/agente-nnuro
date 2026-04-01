import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const botId = request.nextUrl.searchParams.get('botId');

    if (!botId) {
      return NextResponse.json(
        { error: 'El parámetro botId es requerido' },
        { status: 400 }
      );
    }

    // Verify bot belongs to user's tenant
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    const { data: bot } = await supabase
      .from('bots')
      .select('id')
      .eq('id', botId)
      .eq('tenant_id', profile?.tenant_id || '')
      .single();

    if (!bot) {
      return NextResponse.json(
        { error: 'Bot no encontrado o no autorizado' },
        { status: 403 }
      );
    }

    const { data: settings, error } = await supabase
      .from('followup_settings')
      .select('*')
      .eq('bot_id', botId)
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Configuración de seguimiento no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error en GET /api/followups:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { botId, ...rawFields } = body;

    // Whitelist: only allow known followup_settings fields
    const ALLOWED_FOLLOWUP_FIELDS = new Set([
      'enabled', 'delay_hours', 'max_followups', 'message_template',
      'followup_message_1', 'followup_message_2', 'followup_message_3',
      'stop_on_reply', 'first_followup_minutes', 'second_followup_minutes',
    ]);
    const updateFields: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rawFields)) {
      if (ALLOWED_FOLLOWUP_FIELDS.has(key)) {
        updateFields[key] = value;
      }
    }

    if (!botId) {
      return NextResponse.json(
        { error: 'El botId es requerido' },
        { status: 400 }
      );
    }

    // Verify bot belongs to user's tenant
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    const { data: bot } = await supabase
      .from('bots')
      .select('id')
      .eq('id', botId)
      .eq('tenant_id', profile?.tenant_id || '')
      .single();

    if (!bot) {
      return NextResponse.json(
        { error: 'Bot no encontrado o no autorizado' },
        { status: 403 }
      );
    }

    // Use service role client to bypass RLS for write operation
    // (authorization was already verified above by checking tenant ownership)
    const serviceClient = await createServiceRoleClient();
    const { data: settings, error } = await serviceClient
      .from('followup_settings')
      .upsert(
        { bot_id: botId, ...updateFields },
        { onConflict: 'bot_id' }
      )
      .select()
      .single();

    if (error) {
      console.error('Error al actualizar seguimiento:', error);
      return NextResponse.json(
        { error: 'Error al actualizar la configuración de seguimiento' },
        { status: 500 }
      );
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error en PUT /api/followups:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
