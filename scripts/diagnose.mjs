import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = readFileSync(resolve(__dirname, '../.env'), 'utf8');
for (const line of env.split('\n')) {
  const [key, ...vals] = line.split('=');
  if (key && vals.length && !key.startsWith('#'))
    process.env[key.trim()] = vals.join('=').trim();
}

const svc = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function main() {
  console.log('\n=== 1. AUTH.USERS ===');
  const { data: { users }, error: listErr } = await svc.auth.admin.listUsers();
  if (listErr) { console.error('Error listando usuarios:', listErr.message); }
  else {
    const admin = users.find(u => u.email?.toLowerCase() === 'nuroagency1m@gmail.com');
    if (admin) {
      console.log('ID en auth.users:        ', admin.id);
      console.log('Email:                   ', admin.email);
      console.log('Email confirmado:        ', admin.email_confirmed_at ? '✅ SI' : '❌ NO');
      console.log('Banned:                  ', admin.banned_until ? '⚠️ SI' : 'No');
    } else {
      console.log('❌ nuroagency1m@gmail.com NO está en auth.users');
    }
  }

  console.log('\n=== 2. PROFILES TABLE ===');
  const { data: profile } = await svc.from('profiles').select('id, email, role').eq('email', 'nuroagency1m@gmail.com').single();
  if (profile) {
    console.log('ID en profiles:          ', profile.id);
    console.log('Email:                   ', profile.email);
    console.log('Role:                    ', profile.role);

    const authUser = users?.find(u => u.id === profile.id);
    console.log('IDs coinciden en auth:   ', authUser ? '✅ SI' : '❌ NO');
  } else {
    console.log('❌ No se encontró el perfil');
  }

  console.log('\n=== 3. COLUMNAS DISPONIBLES EN PROFILES ===');
  const { data: sample } = await svc.from('profiles').select('*').limit(1).maybeSingle();
  if (sample) {
    const cols = Object.keys(sample);
    console.log('Columnas:', cols.join(', '));
    console.log('password_hash visible:          ', cols.includes('password_hash') ? '✅ SI' : '❌ NO (schema cache)');
    console.log('transaction_password_hash:       ', cols.includes('transaction_password_hash') ? '✅ SI' : '❌ NO');
  }

  console.log('\n=== 4. FIX: FORZAR RECARGA DE SCHEMA ===');
  // Use the admin auth user ID to fix auth
  const authAdmin = users?.find(u => u.email?.toLowerCase() === 'nuroagency1m@gmail.com');
  if (authAdmin) {
    const { error: fixErr } = await svc.auth.admin.updateUserById(authAdmin.id, {
      password: '123456789',
      email_confirm: true,
    });
    console.log('Auth password updated:', fixErr ? `❌ ${fixErr.message}` : '✅ OK');

    // Test login
    const anon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { persistSession: false } }
    );
    const { data: loginData, error: loginErr } = await anon.auth.signInWithPassword({
      email: 'nuroagency1m@gmail.com',
      password: '123456789',
    });
    console.log('Test login:', loginErr ? `❌ ${loginErr.message}` : `✅ OK (user: ${loginData?.user?.id})`);
  }

  console.log('\n=== 5. SET HASH EN transaction_password_hash (fallback) ===');
  const hash = await bcrypt.hash('123456789', 10);
  const { error: txErr } = await svc.from('profiles')
    .update({ transaction_password_hash: hash })
    .eq('email', 'nuroagency1m@gmail.com');
  console.log('transaction_password_hash actualizado:', txErr ? `❌ ${txErr.message}` : '✅ OK');
}

main().catch(console.error);
