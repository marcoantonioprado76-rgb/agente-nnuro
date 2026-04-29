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

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function main() {
  // Get admin profile
  const { data: admin, error } = await db
    .from('profiles')
    .select('id, email, role, status, password_hash')
    .eq('role', 'admin')
    .single();

  if (error) { console.error('❌ Error:', error.message); return; }

  console.log('\n=== ADMIN PROFILE ===');
  console.log('Email:         ', admin.email);
  console.log('Role:          ', admin.role);
  console.log('Status:        ', admin.status);
  console.log('password_hash: ', admin.password_hash ? `✅ ${admin.password_hash.slice(0, 30)}...` : '❌ NULL');

  if (admin.password_hash) {
    const ok = await bcrypt.compare('123456789', admin.password_hash);
    console.log('Hash match "123456789":', ok ? '✅ CORRECTO' : '❌ NO COINCIDE');
  }

  // Now force-set the password fresh
  console.log('\n🔧 Re-seteando password_hash ahora...');
  const fresh = await bcrypt.hash('123456789', 10);
  const { error: upErr } = await db
    .from('profiles')
    .update({ password_hash: fresh })
    .eq('id', admin.id);

  if (upErr) { console.error('❌ Update error:', upErr.message); return; }

  const verify = await bcrypt.compare('123456789', fresh);
  console.log('Nuevo hash verificado:', verify ? '✅ OK' : '❌ FALLO');
  console.log('\n📋 Listo. Intenta login con:');
  console.log('   Email:      ', admin.email);
  console.log('   Contraseña: 123456789');
}

main().catch(console.error);
