-- Instance lock: evitar que múltiples instancias del servidor compitan por la misma sesión WhatsApp
-- Cada instancia escribe su instance_id al conectar. Solo la instancia activa puede reconectar.
ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS instance_id TEXT;
ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS instance_heartbeat TIMESTAMPTZ;
