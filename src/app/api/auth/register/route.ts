import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db';
import { signToken, setAuthCookie } from '@/lib/auth';
import { sendWelcomeEmail } from '@/lib/email';

function hashTxPassword(p: string) {
  return crypto.createHash('sha256').update(p + 'ventas_ai_salt_2026').digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const { email, password, full_name, country, city, country_code, phone_number, transaction_password } = await req.json();

    if (!email || !password || !full_name)
      return NextResponse.json({ error: 'Email, contraseña y nombre son requeridos' }, { status: 400 });
    if (password.length < 6)
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });

    const { data: existing } = await db.from('profiles').select('id').eq('email', email.toLowerCase()).maybeSingle();
    if (existing)
      return NextResponse.json({ error: 'Ya existe una cuenta con este correo' }, { status: 409 });

    const { count } = await db.from('profiles').select('*', { count: 'exact', head: true });
    const role = (count ?? 0) === 0 ? 'admin' : 'user';

    const profileId = uuidv4();
    const password_hash = await bcrypt.hash(password, 12);
    const now = new Date().toISOString();

    const { error: insertError } = await db.from('profiles').insert({
      id: profileId,
      email: email.toLowerCase(),
      full_name: full_name || '',
      role,
      tenant_id: profileId,
      password_hash,
      country: country || '',
      city: city || '',
      phone_number: phone_number || '',
      country_code: country_code || '',
      phone_with_code: phone_number && country_code ? `${country_code}${phone_number}` : '',
      transaction_password_hash: transaction_password ? hashTxPassword(transaction_password) : null,
      login_provider: 'email',
      status: 'active',
      is_active: true,
      last_login_at: now,
      created_at: now,
      updated_at: now,
    });

    if (insertError) {
      console.error('[register] insert error:', insertError);
      return NextResponse.json({ error: 'Error al crear la cuenta' }, { status: 500 });
    }

    sendWelcomeEmail(email, full_name).catch(() => {});

    const token = await signToken({ sub: profileId, email: email.toLowerCase(), role, tenant_id: profileId });
    await setAuthCookie(token);

    return NextResponse.json({ message: 'Cuenta creada exitosamente', userId: profileId }, { status: 201 });
  } catch (err) {
    console.error('[auth/register]', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
