import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verify tenant access
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
    }

    // Verify conversation belongs to tenant's bots
    const { data: conversation } = await supabase
      .from('conversations')
      .select('id, bot_id, bots(tenant_id)')
      .eq('id', id)
      .single();

    if (!conversation) {
      return NextResponse.json({ error: 'Conversacion no encontrada' }, { status: 404 });
    }

    const tenantId = (conversation.bots as unknown as { tenant_id: string })?.tenant_id;
    if (tenantId !== profile.tenant_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Get messages
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '100');
    const { data: messages, error } = await supabase
      .from('messages')
      .select('id, conversation_id, sender, type, content, metadata, created_at')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: 'Error al obtener mensajes' }, { status: 500 });
    }

    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error en GET /api/conversations/[id]/messages:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
