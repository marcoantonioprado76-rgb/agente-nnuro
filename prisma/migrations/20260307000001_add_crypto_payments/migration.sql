-- Nuevos valores al enum RequestStatus
ALTER TYPE "RequestStatus" ADD VALUE IF NOT EXISTS 'PENDING_VERIFICATION';

-- Nuevo enum PaymentMethod
DO $$ BEGIN
  CREATE TYPE "PaymentMethod" AS ENUM ('MANUAL', 'CRYPTO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Columnas en pack_purchase_requests
ALTER TABLE pack_purchase_requests
  ADD COLUMN IF NOT EXISTS payment_method "PaymentMethod" NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS tx_hash        TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS block_number   BIGINT;
