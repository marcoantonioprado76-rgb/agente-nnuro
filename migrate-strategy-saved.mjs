/**
 * Agrega la columna saved_by_user a ad_strategies.
 * Ejecutar UNA sola vez:  node migrate-strategy-saved.mjs
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

try {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE ad_strategies
    ADD COLUMN IF NOT EXISTS saved_by_user BOOLEAN NOT NULL DEFAULT false
  `)
  console.log('✅ Columna saved_by_user agregada a ad_strategies')
} catch (err) {
  console.error('❌ Error:', err.message)
  process.exit(1)
} finally {
  await prisma.$disconnect()
}
