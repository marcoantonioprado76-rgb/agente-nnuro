/**
 * Agrega la columna opcional `phone` a la tabla users.
 * La usa el panel admin para editar el teléfono de cada usuario.
 *
 * Ejecutar UNA sola vez:  node migrate-user-phone.mjs
 *
 * Seguro: ADD COLUMN IF NOT EXISTS, nullable, sin default forzado.
 * No toca ni borra datos existentes (los usuarios actuales quedan con phone = NULL).
 */
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

try {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT
  `)
  console.log('✅ Columna users.phone lista')
} catch (err) {
  console.error('❌ Error:', err.message)
  process.exit(1)
} finally {
  await prisma.$disconnect()
}
