/**
 * Reto 90D — Migración de arreglos de lógica de negocio.
 *
 * Ejecutar UNA sola vez:  node migrate-reto90d-fixes.mjs
 * Luego:  npx prisma generate   (para que el cliente conozca RetoSendLog)
 *
 * Idempotente y NO destructivo (todo con IF NOT EXISTS). No borra ni modifica
 * datos existentes.
 *
 * Agrega:
 *  1) Tabla `reto90d_send_log` → idempotencia PERSISTENTE de recordatorios y
 *     resúmenes (reemplaza los Sets en memoria del scheduler). Único por
 *     (challenge_id, kind, date).
 *  2) Índice compuesto en `reto90d_submissions` (challenge_id, phone, submitted_at)
 *     para acelerar las consultas por miembro y día.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Aplicando migración de arreglos Reto 90D...')

  // 1) Tabla de idempotencia persistente de envíos programados.
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS reto90d_send_log (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      challenge_id UUID NOT NULL,
      kind         TEXT NOT NULL,
      date         TEXT NOT NULL,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `)

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS reto90d_send_log_challenge_id_kind_date_key
      ON reto90d_send_log(challenge_id, kind, date);
  `)

  // 2) Índice compuesto para submissions (consultas por miembro + día).
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS reto90d_submissions_challenge_id_phone_submitted_at_idx
      ON reto90d_submissions(challenge_id, phone, submitted_at);
  `)

  console.log('✅ Migración Reto 90D aplicada correctamente.')
  console.log('⚠️  Ahora corré: npx prisma generate')
}

main()
  .catch((e) => { console.error('❌ Migración falló:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
