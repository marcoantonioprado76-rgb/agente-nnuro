/**
 * Landing Pages — agrega la columna `views` (contador de visitas públicas).
 *
 * Ejecutar UNA vez desde /opt/mydymond (donde está el .env):
 *   node migrate-landing-views.mjs
 * El build ya corre `prisma generate`, así que no hace falta correrlo aparte.
 *
 * Idempotente y NO destructivo (ADD COLUMN IF NOT EXISTS). No toca datos.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Agregando columna views a landing_pages...')
  await prisma.$executeRawUnsafe(
    `ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS views integer NOT NULL DEFAULT 0;`,
  )
  const [{ count }] = await prisma.$queryRawUnsafe(
    `SELECT count(*)::int AS count FROM landing_pages;`,
  )
  console.log(`✅ Columna views lista. Landings existentes: ${count} (todas arrancan en 0 visitas).`)
}

main()
  .catch((e) => { console.error('❌ Migración falló:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
