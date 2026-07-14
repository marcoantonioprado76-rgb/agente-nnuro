-- Reto 90D: system prompt configurable del bot (tono/trato/contexto del plan)
ALTER TABLE "reto90d_whatsapp_config" ADD COLUMN IF NOT EXISTS "bot_instructions" TEXT;
