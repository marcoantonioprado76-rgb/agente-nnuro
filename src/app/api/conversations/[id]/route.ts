import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function DELETE(
  _request: NextRequest,
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

    // Delete messages first (foreign key), then conversation
    await supabase
      .from('messages')
      .delete()
      .eq('conversation_id', id);

    const { error: deleteError } = await supabase
      .from('conversations')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error eliminando conversacion:', deleteError);
      return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error en DELETE /api/conversations/[id]:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
