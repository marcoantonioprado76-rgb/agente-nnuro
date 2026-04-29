import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { signToken, setAuthCookie } from '@/lib/auth';

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'fallback-secret-change-in-production'
);

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || !password)
      return NextResponse.json({ error: 'Token y contraseña requeridos' }, { status: 400 });
    if (password.length < 6)
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });

    let payload: { sub: string; purpose: string };
    try {
      const result = await jwtVerify(token, SECRET);
      payload = result.payload as unknown as { sub: string; purpose: string };
    } catch {
      return NextResponse.json({ error: 'El enlace es inválido o ha expirado' }, { status: 400 });
    }

    if (payload.purpose !== 'password_reset')
      return NextResponse.json({ error: 'Token inválido' }, { status: 400 });

    const { data: profile } = await db
      .from('profiles').select('id, email, role, tenant_id').eq('id', payload.sub).maybeSingle();

    if (!profile)
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

    const password_hash = await bcrypt.hash(password, 12);
    await db.from('profiles').update({ password_hash }).eq('id', profile.id);

    // Auto-login after reset
    const authToken = await signToken({
      sub: profile.id, email: profile.email,
      role: profile.role, tenant_id: profile.tenant_id,
    });
    await setAuthCookie(authToken);

    return NextResponse.json({ message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    console.error('[auth/reset-password]', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
