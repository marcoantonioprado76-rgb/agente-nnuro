-- PENDING_VERIFICATION en MarketplacePurchaseStatus
ALTER TYPE "MarketplacePurchaseStatus" ADD VALUE IF NOT EXISTS 'PENDING_VERIFICATION';

-- Columnas crypto en marketplace_purchases
ALTER TABLE marketplace_purchases
  ADD COLUMN IF NOT EXISTS payment_method "PaymentMethod" NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS tx_hash TEXT UNIQUE;
