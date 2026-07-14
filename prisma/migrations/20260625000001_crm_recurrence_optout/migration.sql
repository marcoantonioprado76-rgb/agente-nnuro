-- CRM Fase 3 (remarketing recurrente) + Fase 4 (opt-out). Idempotente.

-- Fase 3 — recurrencia
ALTER TABLE "broadcast_campaigns" ADD COLUMN IF NOT EXISTS "recurring" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "broadcast_campaigns" ADD COLUMN IF NOT EXISTS "recurrence_days" TEXT;
ALTER TABLE "broadcast_campaigns" ADD COLUMN IF NOT EXISTS "recurrence_time" TEXT;
ALTER TABLE "broadcast_campaigns" ADD COLUMN IF NOT EXISTS "recurrence_image_id" UUID;
ALTER TABLE "broadcast_campaigns" ADD COLUMN IF NOT EXISTS "next_run_at" TIMESTAMP(3);

-- Fase 4 — opt-out (BAJA)
ALTER TABLE "broadcast_contacts" ADD COLUMN IF NOT EXISTS "opted_out" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "broadcast_contacts" ADD COLUMN IF NOT EXISTS "opted_out_at" TIMESTAMP(3);
