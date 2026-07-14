/**
 * Crea tabla admin_otp_codes para 2FA del panel admin.
 * Ejecutar UNA sola vez: node migrate-admin-otp.mjs
 */
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

try {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS admin_otp_codes (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      code       TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used       BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS admin_otp_codes_user_id_idx ON admin_otp_codes(user_id)
  `)
  console.log('✅ Tabla admin_otp_codes creada')
} catch (err) {
  console.error('❌ Error:', err.message)
  process.exit(1)
} finally {
  await prisma.$disconnect()
}
