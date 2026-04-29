import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from '@/lib/auth';

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { data: profile, error } = await db
    .from('profiles')
    .select('id, email, full_name, avatar_url, role, tenant_id, is_active, country, city, phone_number, country_code, phone_with_code, login_provider, status, last_login_at, onboarding_completed, created_at, updated_at')
    .eq('id', session.sub)
    .single();

  if (error || !profile)
    return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });

  return NextResponse.json(profile);
}
