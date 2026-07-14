/**
 * Migration: add cloned_from_id + shared_by_username to products table
 * Run: node migrate-product-share.mjs
 * Delete this file after running.
 */
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE products
      ADD COLUMN IF NOT EXISTS cloned_from_id UUID REFERENCES products(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS shared_by_username TEXT;
  `)
  console.log('✅ Migration applied: cloned_from_id + shared_by_username added to products')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
