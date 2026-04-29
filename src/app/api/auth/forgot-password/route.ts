import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { db } from '@/lib/db';
import { sendPasswordRecoveryEmail } from '@/lib/email';

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'fallback-secret-change-in-production'
);

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'El email es requerido' }, { status: 400 });

    const { data: profile } = await db
      .from('profiles').select('id, full_name').eq('email', email.toLowerCase()).maybeSingle();

    if (!profile)
      return NextResponse.json({ message: 'Si el correo existe, recibirás un enlace de recuperación.' });

    const token = await new SignJWT({ sub: profile.id, purpose: 'password_reset' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(SECRET);

    const appUrl   = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    await sendPasswordRecoveryEmail(email, profile.full_name || 'Usuario', resetUrl).catch(() => {});

    return NextResponse.json({ message: 'Si el correo existe, recibirás un enlace de recuperación.' });
  } catch (err) {
    console.error('[auth/forgot-password]', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
