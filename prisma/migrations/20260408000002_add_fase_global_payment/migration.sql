-- Add FASE_GLOBAL to PaymentMethod enum
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'FASE_GLOBAL';

-- Add Fase Global fields to pack_purchase_requests
ALTER TABLE pack_purchase_requests ADD COLUMN IF NOT EXISTS fase_global_code TEXT;
ALTER TABLE pack_purchase_requests ADD COLUMN IF NOT EXISTS fase_global_note TEXT;
