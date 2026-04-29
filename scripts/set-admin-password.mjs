import { createClient } from '@supabase/supabase-js';
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

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function main() {
  // Find admin profile
  const { data: profile, error } = await admin
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('role', 'admin')
    .single();

  if (error || !profile) {
    console.error('❌ Admin no encontrado:', error?.message);
    process.exit(1);
  }

  console.log(`\n👤 Admin: ${profile.email} (${profile.full_name || 'Sin nombre'})`);

  // Update Supabase Auth password
  const { error: updateErr } = await admin.auth.admin.updateUserById(profile.id, {
    password: '123456789',
  });

  if (updateErr) {
    console.error('❌ Error actualizando contraseña:', updateErr.message);
    process.exit(1);
  }

  console.log('\n✅ Contraseña de Supabase Auth actualizada.');

  // Verify login works
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
  );
  const { error: loginErr } = await anonClient.auth.signInWithPassword({
    email: profile.email,
    password: '123456789',
  });

  if (loginErr) {
    console.error('❌ Verificación fallida:', loginErr.message);
    process.exit(1);
  }

  console.log('✅ Login verificado correctamente.');
  console.log('\n📋 Credenciales:');
  console.log(`   Email:      ${profile.email}`);
  console.log(`   Contraseña: 123456789`);
  console.log('\n🔑 Acceso:');
  console.log('   Usuario:  /dashboard');
  console.log('   Admin:    /admin/dashboard');
}

main().catch(err => { console.error('❌ Error:', err.message); process.exit(1); });
