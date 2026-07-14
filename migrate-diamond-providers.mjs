/**
 * Agrega las columnas de credenciales de proveedor de WhatsApp a diamond_agents.
 * Las usa el módulo Diamond Assistant para guardar el token (cifrado) y el
 * número/ID de WhatsApp del proveedor (YCloud/Meta) por agente.
 *
 * Ejecutar UNA sola vez:  node migrate-diamond-providers.mjs
 *
 * Seguro e idempotente: ADD COLUMN IF NOT EXISTS, ambas nullable, sin default.
 * No toca ni borra datos existentes (los agentes actuales quedan con NULL).
 */
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

try {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE diamond_agents ADD COLUMN IF NOT EXISTS provider_api_key_enc TEXT
  `)
  await prisma.$executeRawUnsafe(`
    ALTER TABLE diamond_agents ADD COLUMN IF NOT EXISTS provider_sender TEXT
  `)
  console.log('✅ Columnas diamond_agents.provider_api_key_enc y provider_sender listas')
} catch (err) {
  console.error('❌ Error:', err.message)
  process.exit(1)
} finally {
  await prisma.$disconnect()
}
