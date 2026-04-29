import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { signToken, setAuthCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password)
      return NextResponse.json({ error: 'Email y contraseña requeridos' }, { status: 400 });

    const { data: profile } = await db
      .from('profiles')
      .select('id, email, full_name, role, tenant_id, status, is_active, password_hash')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (!profile || !profile.password_hash)
      return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 });

    const valid = await bcrypt.compare(password, profile.password_hash);
    if (!valid)
      return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 });

    if (profile.status === 'suspended')
      return NextResponse.json({ error: 'Cuenta suspendida. Contacta al administrador.' }, { status: 403 });
    if (profile.status === 'blocked')
      return NextResponse.json({ error: 'Cuenta bloqueada. Contacta al administrador.' }, { status: 403 });
    if (!profile.is_active)
      return NextResponse.json({ error: 'Cuenta inactiva.' }, { status: 403 });

    const token = await signToken({
      sub:       profile.id,
      email:     profile.email,
      role:      profile.role,
      tenant_id: profile.tenant_id,
    });
    await setAuthCookie(token);

    db.from('profiles').update({ last_login_at: new Date().toISOString() }).eq('id', profile.id).then(() => {});

    const { password_hash: _, ...safeProfile } = profile;
    return NextResponse.json({ user: safeProfile });
  } catch (err) {
    console.error('[auth/login]', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
