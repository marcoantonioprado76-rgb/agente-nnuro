-- Reto 90D: mensaje de bienvenida configurable al registrarse
ALTER TABLE "reto90d_whatsapp_config" ADD COLUMN IF NOT EXISTS "welcome_message" TEXT;
