-- Pago cripto "monto único" (crypto-B) para planes: auto-detección on-chain sin pegar hash.
-- Agrega el monto exacto único y el vencimiento del pago pendiente a las solicitudes de plan.
ALTER TABLE "pack_purchase_requests" ADD COLUMN IF NOT EXISTS "expected_amount" DECIMAL(14,4);
ALTER TABLE "pack_purchase_requests" ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMP(3);
