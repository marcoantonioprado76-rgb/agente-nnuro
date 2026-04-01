import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

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

    // Get user profile for tenant isolation
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: 'Perfil no encontrado' },
        { status: 404 }
      );
    }

    const { data: bots } = await supabase
      .from('bots')
      .select('id')
      .eq('tenant_id', profile.tenant_id);

    const botIds = bots?.map(b => b.id) || [];

    if (botIds.length === 0) {
      return NextResponse.json([]);
    }

    const botId = request.nextUrl.searchParams.get('botId');

    let query = supabase
      .from('conversations')
      .select('*, contacts(*), bots(name)')
      .in('bot_id', botIds)
      .order('last_message_at', { ascending: false });

    // If botId provided, also filter by specific bot (within tenant's bots)
    if (botId && botIds.includes(botId)) {
      query = supabase
        .from('conversations')
        .select('*, contacts(*), bots(name)')
        .eq('bot_id', botId)
        .order('last_message_at', { ascending: false });
    }

    const { data: conversations, error } = await query;

    if (error) {
      console.error('Error al obtener conversaciones:', error);
      return NextResponse.json(
        { error: 'Error al obtener las conversaciones' },
        { status: 500 }
      );
    }

    return NextResponse.json(conversations);
  } catch (error) {
    console.error('Error en GET /api/conversations:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
