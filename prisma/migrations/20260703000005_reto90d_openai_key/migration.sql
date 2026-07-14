-- Reto 90D: API key de OpenAI configurable desde el panel (cifrada)
ALTER TABLE "reto90d_whatsapp_config" ADD COLUMN IF NOT EXISTS "openai_api_key_enc" TEXT;
