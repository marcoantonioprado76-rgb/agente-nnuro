/**
 * Agrega columna address a trusted_devices.
 * Ejecutar UNA sola vez:  node migrate-device-address.mjs
 */
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

try {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE trusted_devices
      ADD COLUMN IF NOT EXISTS address TEXT
  `)
  console.log('✅ Columna address agregada a trusted_devices')
} catch (err) {
  console.error('❌ Error:', err.message)
  process.exit(1)
} finally {
  await prisma.$disconnect()
}
