-- Reto 90D: API key de ElevenLabs (cifrada) + voz elegida
ALTER TABLE "reto90d_whatsapp_config" ADD COLUMN IF NOT EXISTS "elevenlabs_api_key_enc" TEXT;
ALTER TABLE "reto90d_whatsapp_config" ADD COLUMN IF NOT EXISTS "voice_id" TEXT;
