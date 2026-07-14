-- Add isAdmin to users
ALTER TABLE "users" ADD COLUMN "is_admin" BOOLEAN NOT NULL DEFAULT false;

-- Create RequestStatus enum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PAID');

-- Create pack_purchase_requests table
CREATE TABLE "pack_purchase_requests" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "plan" "UserPlan" NOT NULL,
  "price" DECIMAL(10, 2) NOT NULL,
  "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
  "notes" TEXT,
  "reviewed_by" UUID,
  "reviewed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pack_purchase_requests_pkey" PRIMARY KEY ("id")
);

-- Create withdrawal_requests table
CREATE TABLE "withdrawal_requests" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "amount" DECIMAL(12, 2) NOT NULL,
  "wallet_qr_url" TEXT,
  "wallet_address" TEXT,
  "proof_url" TEXT,
  "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
  "notes" TEXT,
  "reviewed_by" UUID,
  "reviewed_at" TIMESTAMP(3),
  "paid_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "withdrawal_requests_pkey" PRIMARY KEY ("id")
);

-- Create app_settings table
CREATE TABLE "app_settings" (
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key")
);

-- Foreign keys
ALTER TABLE "pack_purchase_requests" ADD CONSTRAINT "pack_purchase_requests_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Default pack prices
INSERT INTO "app_settings" ("key", "value", "updated_at") VALUES
  ('PRICE_BASIC', '49', NOW()),
  ('PRICE_PRO', '99', NOW()),
  ('PRICE_ELITE', '199', NOW())
ON CONFLICT ("key") DO NOTHING;
