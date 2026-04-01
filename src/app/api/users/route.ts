import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

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

    // Verificar que el usuario es admin
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

    if (profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'No tienes permisos para realizar esta acción' },
        { status: 403 }
      );
    }

    const { data: users, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error al obtener usuarios:', error);
      return NextResponse.json(
        { error: 'Error al obtener los usuarios' },
        { status: 500 }
      );
    }

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error en GET /api/users:', error);
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

    // Verificar que el usuario es admin
    const { data: adminProfile, error: profileError } = await supabase
      .from('profiles')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !adminProfile) {
      return NextResponse.json(
        { error: 'Perfil de usuario no encontrado' },
        { status: 404 }
      );
    }

    if (adminProfile.role !== 'admin') {
      return NextResponse.json(
        { error: 'No tienes permisos para realizar esta acción' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, password, full_name, role } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos' },
        { status: 400 }
      );
    }

    // Usar service role client para crear usuario en auth
    const serviceClient = await createServiceRoleClient();

    const { data: newAuthUser, error: createError } = await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name || '' },
    });

    if (createError) {
      console.error('Error al crear usuario en auth:', createError);
      return NextResponse.json(
        { error: 'Error al crear el usuario: ' + createError.message },
        { status: 500 }
      );
    }

    // Actualizar el perfil creado por el trigger para asignar el tenant correcto
    const { data: newProfile, error: updateError } = await serviceClient
      .from('profiles')
      .update({
        full_name: full_name || '',
        role: role || 'user',
        tenant_id: adminProfile.tenant_id,
      })
      .eq('id', newAuthUser.user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error al actualizar perfil:', updateError);
      return NextResponse.json(
        { error: 'Usuario creado pero error al configurar perfil' },
        { status: 500 }
      );
    }

    return NextResponse.json(newProfile, { status: 201 });
  } catch (error) {
    console.error('Error en POST /api/users:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
