/**
 * Agrega columnas de info de dispositivo/ubicación a trusted_devices.
 * Ejecutar UNA sola vez:  node migrate-device-info.mjs
 */
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

try {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE trusted_devices
      ADD COLUMN IF NOT EXISTS ip TEXT,
      ADD COLUMN IF NOT EXISTS city TEXT,
      ADD COLUMN IF NOT EXISTS country TEXT,
      ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS browser TEXT,
      ADD COLUMN IF NOT EXISTS os TEXT,
      ADD COLUMN IF NOT EXISTS device_type TEXT,
      ADD COLUMN IF NOT EXISTS prev_ip TEXT,
      ADD COLUMN IF NOT EXISTS prev_city TEXT,
      ADD COLUMN IF NOT EXISTS location_changed BOOLEAN NOT NULL DEFAULT false
  `)
  console.log('✅ Columnas de dispositivo/ubicación agregadas a trusted_devices')
} catch (err) {
  console.error('❌ Error:', err.message)
  process.exit(1)
} finally {
  await prisma.$disconnect()
}
