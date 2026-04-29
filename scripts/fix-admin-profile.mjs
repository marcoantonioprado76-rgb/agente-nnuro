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

const svc = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const AUTH_ID    = '2a76036d-94f4-4063-8674-a2cb4d4e9a83';
const ADMIN_EMAIL = 'nuroagency1m@gmail.com';

async function main() {
  // 1. Find profile by auth ID
  const { data: byId } = await svc
    .from('profiles')
    .select('id, email, role, tenant_id')
    .eq('id', AUTH_ID)
    .maybeSingle();

  console.log('\n📋 Profile by auth ID:', byId ? `✅ encontrado (role: ${byId.role})` : '❌ NO existe');

  // 2. Find profile by role=admin
  const { data: byRole } = await svc
    .from('profiles')
    .select('id, email, role, tenant_id')
    .eq('role', 'admin')
    .maybeSingle();

  console.log('📋 Profile by role=admin:', byRole ? `✅ ID: ${byRole.id}, email: ${byRole.email}` : '❌ NO existe');

  if (!byId && byRole) {
    // Admin profile exists but with wrong ID — update it to match auth user
    console.log('\n🔧 Actualizando profile para que coincida con auth.users ID...');
    const { error } = await svc
      .from('profiles')
      .update({ id: AUTH_ID, email: ADMIN_EMAIL })
      .eq('id', byRole.id);

    if (error) {
      console.log('⚠️  No se puede cambiar el ID directamente. Creando nuevo perfil...');
      // Get the tenant from existing profile
      const tenant_id = byRole.tenant_id;

      // Insert new profile with correct ID
      const { error: insertErr } = await svc.from('profiles').insert({
        id:        AUTH_ID,
        email:     ADMIN_EMAIL,
        full_name: 'Administrador',
        role:      'admin',
        tenant_id: tenant_id,
        is_active: true,
        status:    'active',
        login_provider: 'email',
      });

      if (insertErr) {
        console.error('❌ Error insertando:', insertErr.message);
      } else {
        console.log('✅ Perfil creado con ID correcto.');
      }
    } else {
      console.log('✅ ID del perfil actualizado.');
    }
  } else if (byId) {
    console.log('\n✅ El perfil ya tiene el ID correcto de auth.users.');
    // Make sure it's admin
    if (byId.role !== 'admin') {
      await svc.from('profiles').update({ role: 'admin' }).eq('id', AUTH_ID);
      console.log('✅ Role actualizado a admin.');
    }
  } else {
    console.log('\n⚠️  No existe ningún perfil admin — creando...');
    const { data: tenant } = await svc.from('tenants').insert({
      name:     'Administrador',
      slug:     'admin-nuroagency',
      owner_id: AUTH_ID,
    }).select('id').single();

    await svc.from('profiles').insert({
      id:        AUTH_ID,
      email:     ADMIN_EMAIL,
      full_name: 'Administrador',
      role:      'admin',
      tenant_id: tenant?.id,
      is_active: true,
      status:    'active',
      login_provider: 'email',
    });
    console.log('✅ Perfil admin creado.');
  }

  // Final check
  const { data: final } = await svc
    .from('profiles')
    .select('id, email, role, tenant_id, status')
    .eq('id', AUTH_ID)
    .single();

  console.log('\n=== ESTADO FINAL ===');
  console.log('ID:        ', final?.id);
  console.log('Email:     ', final?.email);
  console.log('Role:      ', final?.role);
  console.log('Tenant:    ', final?.tenant_id);
  console.log('Status:    ', final?.status);
  console.log('\n🎉 Listo. Ahora prueba el login con:');
  console.log('   Email:      nuroagency1m@gmail.com');
  console.log('   Contraseña: 123456789');
}

main().catch(console.error);
