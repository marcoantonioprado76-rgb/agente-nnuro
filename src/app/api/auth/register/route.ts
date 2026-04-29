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
    const {
      email, password, full_name,
      country, city, country_code, phone_number, transaction_password,
    } = await req.json();

    if (!email || !password || !full_name)
      return NextResponse.json({ error: 'Email, contraseña y nombre son requeridos' }, { status: 400 });
    if (password.length < 6)
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });

    // Check existing
    const { data: existing } = await db
      .from('profiles').select('id').eq('email', email.toLowerCase()).maybeSingle();
    if (existing)
      return NextResponse.json({ error: 'Ya existe una cuenta con este correo' }, { status: 409 });

    // First user is admin
    const { count } = await db.from('profiles').select('*', { count: 'exact', head: true });
    const role = (count ?? 0) === 0 ? 'admin' : 'user';

    const profileId     = uuidv4();
    const password_hash = await bcrypt.hash(password, 12);
    const slugBase      = email.toLowerCase().replace('@', '-').replace(/[^a-z0-9-]/g, '');
    const slug          = `${slugBase}-${profileId.slice(0, 6)}`;

    // Create tenant
    const { data: tenant } = await db
      .from('tenants')
      .insert({ name: full_name, slug, owner_id: profileId })
      .select('id').single();

    if (!tenant)
      return NextResponse.json({ error: 'Error al crear el tenant' }, { status: 500 });

    // Create profile
    await db.from('profiles').insert({
      id:            profileId,
      email:         email.toLowerCase(),
      full_name:     full_name || '',
      role,
      tenant_id:     tenant.id,
      password_hash,
      country:       country  || '',
      city:          city     || '',
      phone_number:  phone_number  || '',
      country_code:  country_code  || '',
      phone_with_code: phone_number && country_code ? `${country_code}${phone_number}` : '',
      transaction_password_hash: transaction_password ? hashTxPassword(transaction_password) : null,
      login_provider: 'email',
      status: 'active',
      last_login_at: new Date().toISOString(),
    });

    // Admin notification (non-blocking)
    db.from('admin_notifications').insert({
      type: 'new_user', title: 'Nuevo usuario registrado',
      message: `${full_name} (${email}) se registró`,
      target_user_id: profileId,
    }).then(() => {});

    sendWelcomeEmail(email, full_name).catch(() => {});

    const token = await signToken({
      sub: profileId, email: email.toLowerCase(), role, tenant_id: tenant.id,
    });
    await setAuthCookie(token);

    return NextResponse.json({ message: 'Cuenta creada exitosamente', userId: profileId }, { status: 201 });
  } catch (err) {
    console.error('[auth/register]', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
