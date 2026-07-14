/**
 * Crea las tablas trusted_devices y device_verify_codes.
 * Ejecutar UNA sola vez:  node migrate-device-auth.mjs
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

try {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS trusted_devices (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      device_id   TEXT NOT NULL,
      label       TEXT,
      last_seen   TIMESTAMPTZ NOT NULL DEFAULT now(),
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (user_id, device_id)
    )
  `)

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_trusted_devices_user_id ON trusted_devices(user_id)
  `)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS device_verify_codes (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      device_id   TEXT NOT NULL,
      code        TEXT NOT NULL,
      expires_at  TIMESTAMPTZ NOT NULL,
      used        BOOLEAN NOT NULL DEFAULT false,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_device_verify_codes_user_device ON device_verify_codes(user_id, device_id)
  `)

  console.log('✅ Tablas creadas: trusted_devices, device_verify_codes')
} catch (err) {
  console.error('❌ Error:', err.message)
  process.exit(1)
} finally {
  await prisma.$disconnect()
}
