/**
 * Migration: add order_report to conversations table
 * Run: node migrate-order-report.mjs
 * Delete this file after running.
 */
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE conversations
      ADD COLUMN IF NOT EXISTS order_report TEXT;
  `)
  console.log('✅ Migration applied: order_report added to conversations')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
