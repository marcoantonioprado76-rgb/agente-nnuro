import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { createUserNotification, createAdminNotification } from '@/lib/notifications';

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

    // Obtener tenant_id del perfil del usuario
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

    const { data: bots, error } = await supabase
      .from('bots')
      .select('*, whatsapp_sessions(id, bot_id, status, phone_number)')
      .eq('tenant_id', profile.tenant_id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Error al obtener los bots' },
        { status: 500 }
      );
    }

    return NextResponse.json(bots);
  } catch (error) {
    console.error('Error en GET /api/bots:', error);
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
      .select('tenant_id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Perfil de usuario no encontrado' },
        { status: 404 }
      );
    }

    // Administradores no pueden crear bots propios
    if (profile.role === 'admin') {
      return NextResponse.json(
        { error: 'Los administradores no pueden crear bots. Esta función es exclusiva para usuarios.' },
        { status: 403 }
      );
    }

    // Verificar límite del plan
    const service = await createServiceRoleClient()
    const { data: subscription } = await service
      .from('subscriptions')
      .select('plan_id, plan:plan_id(max_bots)')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .eq('approval_status', 'approved')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (subscription) {
      const maxBots = (subscription.plan as unknown as { max_bots: number })?.max_bots ?? 999
      const { count: currentBots } = await supabase
        .from('bots')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', profile.tenant_id)

      if ((currentBots || 0) >= maxBots) {
        return NextResponse.json(
          { error: `Has alcanzado el límite de ${maxBots} bot(s) de tu plan. Actualiza tu plan para crear más.` },
          { status: 403 }
        )
      }
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'El nombre del bot es requerido' },
        { status: 400 }
      );
    }

    const { data: bot, error } = await supabase
      .from('bots')
      .insert({
        name,
        description: description || null,
        tenant_id: profile.tenant_id,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error al crear bot:', error);
      return NextResponse.json(
        { error: 'Error al crear el bot' },
        { status: 500 }
      );
    }

    // Asegurar que bot_prompts tenga strict_json_output=true (el trigger lo crea con false por defecto en DB)
    await service
      .from('bot_prompts')
      .update({ strict_json_output: true })
      .eq('bot_id', bot.id)

    // Notifications (non-blocking)
    createUserNotification({
      userId: user.id,
      type: 'bot_creado',
      title: 'Bot creado exitosamente',
      message: `Tu agente "${name}" ha sido creado. Configúralo para empezar a vender.`,
      link: `/bots/${bot.id}`,
    }).catch(() => {})

    createAdminNotification({
      type: 'bot_creado',
      title: 'Nuevo bot creado',
      message: `El usuario ${profile.tenant_id} creó el bot "${name}".`,
      relatedUserId: user.id,
      metadata: { bot_id: bot.id, bot_name: name },
    }).catch(() => {})

    return NextResponse.json(bot, { status: 201 });
  } catch (error) {
    console.error('Error en POST /api/bots:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
