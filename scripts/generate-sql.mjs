import bcrypt from 'bcryptjs';

const hash = await bcrypt.hash('123456789', 12);

console.log('\n=== COPIA Y PEGA ESTE SQL EN EL SUPABASE SQL EDITOR ===\n');
console.log(`-- 1. Agregar columna si no existe`);
console.log(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;\n`);
console.log(`-- 2. Actualizar contraseña del admin`);
console.log(`UPDATE profiles`);
console.log(`SET password_hash = '${hash}'`);
console.log(`WHERE role = 'admin';\n`);
console.log('========================================================');
console.log('\nContraseña hasheada: 123456789');
console.log('Hash bcrypt generado:', hash);
