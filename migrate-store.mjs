// Script to apply store migration directly via Prisma $executeRawUnsafe
// Run: node migrate-store.mjs
// Delete this file after running.
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Applying store migration...')

  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StoreOrderStatus') THEN
        CREATE TYPE "StoreOrderStatus" AS ENUM ('PENDING','PENDING_VERIFICATION','APPROVED','REJECTED','SHIPPED','DELIVERED');
      END IF;
    END $$;
  `)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS store_items (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title       TEXT NOT NULL,
      description TEXT NOT NULL,
      category    TEXT NOT NULL DEFAULT 'General',
      price       NUMERIC(10,2) NOT NULL,
      pv          NUMERIC(10,2) NOT NULL DEFAULT 0,
      images      JSONB NOT NULL DEFAULT '[]',
      stock       INT NOT NULL DEFAULT 0,
      variants    JSONB NOT NULL DEFAULT '[]',
      active      BOOLEAN NOT NULL DEFAULT true,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS store_orders (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      total_price     NUMERIC(10,2) NOT NULL,
      total_pv        NUMERIC(10,2) NOT NULL DEFAULT 0,
      status          "StoreOrderStatus" NOT NULL DEFAULT 'PENDING',
      payment_method  TEXT NOT NULL DEFAULT 'MANUAL',
      proof_url       TEXT,
      tx_hash         TEXT,
      block_number    BIGINT,
      recipient_name  TEXT NOT NULL,
      phone           TEXT NOT NULL,
      address         TEXT NOT NULL,
      city            TEXT NOT NULL,
      state           TEXT NOT NULL,
      country         TEXT NOT NULL,
      zip_code        TEXT,
      delivery_notes  TEXT,
      notes           TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `)

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS store_orders_tx_hash_key
      ON store_orders(tx_hash) WHERE tx_hash IS NOT NULL;
  `)

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS store_orders_status_idx ON store_orders(status);
  `)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS store_order_items (
      id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id          UUID NOT NULL REFERENCES store_orders(id) ON DELETE CASCADE,
      item_id           UUID NOT NULL REFERENCES store_items(id),
      quantity          INT NOT NULL DEFAULT 1,
      price_snapshot    NUMERIC(10,2) NOT NULL,
      pv_snapshot       NUMERIC(10,2) NOT NULL DEFAULT 0,
      selected_variants JSONB NOT NULL DEFAULT '{}'
    );
  `)

  console.log('✅ Store migration applied successfully!')
  console.log('⚠️  Delete this file and run: npx prisma generate')
}

main()
  .catch(e => { console.error('❌ Migration failed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
