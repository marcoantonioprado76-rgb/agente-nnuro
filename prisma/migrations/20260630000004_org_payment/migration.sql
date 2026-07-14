-- Pack Empresarial: cobro propio por empresa (transferencia / USDT).
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "pay_usdt_wallet"   TEXT;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "pay_usdt_network"  TEXT;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "pay_bank_info"     TEXT;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "pay_qr_url"        TEXT;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "pay_instructions"  TEXT;
