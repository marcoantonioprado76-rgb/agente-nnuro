import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { db } from '@/lib/db';
import { signToken, setAuthCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password)
      return NextResponse.json({ error: 'Email y contraseña requeridos' }, { status: 400 });

    // 1. Verify credentials via Supabase Auth
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const { data: authData, error: authError } = await anonClient.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError || !authData.user)
      return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 });

    // 2. Fetch profile by auth user ID
    const { data: profile, error: profileError } = await db
      .from('profiles')
      .select('id, email, full_name, role, tenant_id, status, is_active')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (profileError || !profile) {
      // Profile might not exist — create it on the fly
      const { data: newProfile } = await db.from('profiles').upsert({
        id:         authData.user.id,
        email:      authData.user.email!,
        full_name:  authData.user.user_metadata?.full_name || '',
        role:       'user',
        is_active:  true,
        status:     'active',
      }, { onConflict: 'id' }).select('id, email, full_name, role, tenant_id, status').single();

      if (!newProfile)
        return NextResponse.json({ error: 'Error al cargar el perfil' }, { status: 500 });

      const token = await signToken({
        sub:       newProfile.id,
        email:     newProfile.email,
        role:      newProfile.role,
        tenant_id: newProfile.tenant_id,
      });
      await setAuthCookie(token);
      return NextResponse.json({ user: newProfile });
    }

    if (profile.status === 'suspended')
      return NextResponse.json({ error: 'Cuenta suspendida. Contacta al administrador.' }, { status: 403 });
    if (profile.status === 'blocked')
      return NextResponse.json({ error: 'Cuenta bloqueada. Contacta al administrador.' }, { status: 403 });

    // 3. Issue our JWT cookie
    const token = await signToken({
      sub:       profile.id,
      email:     profile.email,
      role:      profile.role,
      tenant_id: profile.tenant_id,
    });
    await setAuthCookie(token);

    // Update last_login_at (non-blocking)
    db.from('profiles')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', profile.id)
      .then(() => {});

    return NextResponse.json({ user: profile });
  } catch (err) {
    console.error('[auth/login]', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
