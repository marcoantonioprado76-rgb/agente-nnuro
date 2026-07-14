-- Add store sharing fields
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "cloned_from_id" UUID;
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "shared_by_username" TEXT;
