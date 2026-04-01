import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Perfil de usuario no encontrado' },
        { status: 404 }
      );
    }

    const { data: leads, error } = await supabase
      .from('leads')
      .select(`
        *,
        contacts (*),
        products (*)
      `)
      .eq('tenant_id', profile.tenant_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error al obtener leads:', error);
      return NextResponse.json(
        { error: 'Error al obtener los leads' },
        { status: 500 }
      );
    }

    return NextResponse.json(leads);
  } catch (error) {
    console.error('Error en GET /api/leads:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Perfil de usuario no encontrado' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { bot_id, contact_id, conversation_id, status, product_id, notes } = body;

    if (!bot_id || !contact_id) {
      return NextResponse.json(
        { error: 'bot_id y contact_id son requeridos' },
        { status: 400 }
      );
    }

    const { data: lead, error } = await supabase
      .from('leads')
      .insert({
        bot_id,
        tenant_id: profile.tenant_id,
        contact_id,
        conversation_id: conversation_id || null,
        status: status || 'new',
        product_id: product_id || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error al crear lead:', error);
      return NextResponse.json(
        { error: 'Error al crear el lead' },
        { status: 500 }
      );
    }

    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    console.error('Error en POST /api/leads:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
