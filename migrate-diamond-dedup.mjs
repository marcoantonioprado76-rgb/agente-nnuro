/**
 * Diamond Assistant — dedup de mensajes entrantes.
 * Agrega diamond_message_logs.provider_msg_id (wamid) + índice único, para no
 * responder dos veces si YCloud reentrega el mismo mensaje.
 * Ejecutar UNA vez:  node migrate-diamond-dedup.mjs   (idempotente, no destructivo)
 */
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
try {
  await prisma.$executeRawUnsafe(`ALTER TABLE diamond_message_logs ADD COLUMN IF NOT EXISTS provider_msg_id TEXT`)
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS diamond_message_logs_provider_msg_id_key ON diamond_message_logs(provider_msg_id)`)
  console.log('✅ dedup listo (provider_msg_id + índice único)')
} catch (e) { console.error('❌', e.message); process.exit(1) } finally { await prisma.$disconnect() }
