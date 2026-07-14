-- Add payment_proof_url to pack_purchase_requests
ALTER TABLE "pack_purchase_requests" ADD COLUMN "payment_proof_url" TEXT;

-- Add payment QR URL setting (empty by default, admin sets it)
INSERT INTO "app_settings" ("key", "value", "updated_at")
VALUES ('PAYMENT_QR_URL', '', NOW())
ON CONFLICT ("key") DO NOTHING;
