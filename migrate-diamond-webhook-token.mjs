/**
 * Agrega la columna opcional `webhook_token` a la tabla diamond_agents.
 * La usa el webhook entrante de YCloud del Diamond Assistant para validar el
 * `?token=` de cada agente IA antes de procesar un mensaje.
 *
 * Ejecutar UNA sola vez:  node migrate-diamond-webhook-token.mjs
 *
 * Seguro / idempotente: ADD COLUMN IF NOT EXISTS, nullable, sin default forzado.
 * No toca ni borra datos existentes (los agentes actuales quedan con
 * webhook_token = NULL; el GET del panel les genera uno de forma perezosa).
 */
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

try {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE diamond_agents ADD COLUMN IF NOT EXISTS webhook_token TEXT
  `)
  console.log('✅ Columna diamond_agents.webhook_token lista')
} catch (err) {
  console.error('❌ Error:', err.message)
  process.exit(1)
} finally {
  await prisma.$disconnect()
}
