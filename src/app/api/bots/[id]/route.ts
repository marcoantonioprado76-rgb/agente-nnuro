import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

async function verifyBotAccess(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, userId: string, botId: string) {
  const { data: profile } = await supabase.from('profiles').select('tenant_id, role').eq('id', userId).single();
  if (!profile) return { allowed: false, profile: null, isAdmin: false };

  // Admins usan service role para acceder a cualquier bot (vía admin API, no aquí para crear)
  if (profile.role === 'admin') {
    return { allowed: true, profile, isAdmin: true };
  }

  // Usuarios normales solo pueden acceder a bots de su tenant
  const service = await createServiceRoleClient();
  const { data: bot } = await service.from('bots').select('tenant_id').eq('id', botId).single();
  if (!bot || bot.tenant_id !== profile.tenant_id) {
    return { allowed: false, profile, isAdmin: false };
  }

  return { allowed: true, profile, isAdmin: false };
}

export async function GET(
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

    const { allowed } = await verifyBotAccess(supabase, user.id, id);
    if (!allowed) {
      return NextResponse.json({ error: 'No tienes acceso a este bot' }, { status: 403 });
    }

    // Usar service role para admins que no son dueños del tenant
    const service = await createServiceRoleClient();
    const { data: bot, error } = await service
      .from('bots')
      .select(`*, bot_prompts (*), followup_settings (*), whatsapp_sessions (*)`)
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Bot no encontrado' }, { status: 404 });
    }

    // Mask the OpenAI API key — never return the full key to the client
    if (bot.openai_api_key) {
      bot.openai_api_key = '••••••••••••' + bot.openai_api_key.slice(-4)
    }

    return NextResponse.json(bot);
  } catch (error) {
    console.error('Error en GET /api/bots/[id]:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PUT(
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

    const { allowed } = await verifyBotAccess(supabase, user.id, id);
    if (!allowed) {
      return NextResponse.json({ error: 'No tienes acceso a este bot' }, { status: 403 });
    }

    const body = await request.json();
    const service = await createServiceRoleClient();

    // Separate bot_prompts update from bot update
    const { bot_prompts: promptData, ...rawBotFields } = body;

    // Whitelist: only allow known bot fields to be updated
    const ALLOWED_BOT_FIELDS = new Set([
      'name', 'description', 'gpt_model', 'is_active', 'report_phone',
      'avatar_url', 'temperature', 'max_tokens', 'language', 'openai_api_key',
    ]);
    const botFields: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rawBotFields)) {
      if (ALLOWED_BOT_FIELDS.has(key)) {
        // Prevent saving masked API key back to DB
        if (key === 'openai_api_key' && typeof value === 'string' && value.startsWith('••')) {
          continue;
        }
        botFields[key] = value;
      }
    }

    // Update bot fields if any
    let updatedBot = null;
    if (Object.keys(botFields).length > 0) {
      const { data: bot, error } = await service
        .from('bots')
        .update({ ...botFields, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error al actualizar bot:', error);
        return NextResponse.json({ error: 'Error al actualizar el bot' }, { status: 500 });
      }
      updatedBot = bot;
    }

    // Update bot_prompts if provided
    if (promptData) {
      const { id: promptId, ...promptFields } = promptData;
      promptFields.updated_at = new Date().toISOString();

      if (promptId) {
        // Update existing prompt
        await service
          .from('bot_prompts')
          .update(promptFields)
          .eq('id', promptId);
      } else {
        // Upsert by bot_id
        await service
          .from('bot_prompts')
          .update(promptFields)
          .eq('bot_id', id);
      }
    }

    // Return full bot with relations
    const { data: fullBot } = await service
      .from('bots')
      .select('*, bot_prompts (*), followup_settings (*), whatsapp_sessions (*)')
      .eq('id', id)
      .single();

    return NextResponse.json(fullBot || updatedBot);
  } catch (error) {
    console.error('Error en PUT /api/bots/[id]:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PATCH(
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

    const { allowed } = await verifyBotAccess(supabase, user.id, id);
    if (!allowed) {
      return NextResponse.json({ error: 'No tienes acceso a este bot' }, { status: 403 });
    }

    const body = await request.json();
    const service = await createServiceRoleClient();

    // Whitelist: only allow known bot fields
    const ALLOWED_PATCH_FIELDS = new Set([
      'name', 'description', 'gpt_model', 'is_active', 'report_phone',
      'avatar_url', 'temperature', 'max_tokens', 'language', 'openai_api_key',
    ]);
    const safeBody: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      if (ALLOWED_PATCH_FIELDS.has(key)) {
        if (key === 'openai_api_key' && typeof value === 'string' && value.startsWith('••')) {
          continue;
        }
        safeBody[key] = value;
      }
    }

    const { data: bot, error } = await service
      .from('bots')
      .update({ ...safeBody, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error al actualizar bot (PATCH):', error);
      return NextResponse.json({ error: 'Error al actualizar el bot' }, { status: 500 });
    }

    return NextResponse.json(bot);
  } catch (error) {
    console.error('Error en PATCH /api/bots/[id]:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

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

    const { allowed } = await verifyBotAccess(supabase, user.id, id);
    if (!allowed) {
      return NextResponse.json({ error: 'No tienes acceso a este bot' }, { status: 403 });
    }

    const service = await createServiceRoleClient();
    const { error } = await service.from('bots').delete().eq('id', id);

    if (error) {
      console.error('Error al eliminar bot:', error);
      return NextResponse.json({ error: 'Error al eliminar el bot' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Bot eliminado correctamente' });
  } catch (error) {
    console.error('Error en DELETE /api/bots/[id]:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
