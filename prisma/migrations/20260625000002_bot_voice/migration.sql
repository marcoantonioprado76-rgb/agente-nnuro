-- Nota de voz (TTS) por bot. Aditivo, default OFF. Idempotente.
ALTER TABLE "bots" ADD COLUMN IF NOT EXISTS "voice_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "bots" ADD COLUMN IF NOT EXISTS "voice_mode" TEXT NOT NULL DEFAULT 'off';
ALTER TABLE "bots" ADD COLUMN IF NOT EXISTS "voice_id" TEXT;
