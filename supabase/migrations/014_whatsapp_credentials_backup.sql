-- =====================================================
-- Migration 014: Backup de credenciales WhatsApp en DB
-- Permite persistir credenciales de Baileys en Supabase
-- para sobrevivir reinicios de contenedor Docker
-- =====================================================

-- Agregar columna JSONB para almacenar todas las credenciales
ALTER TABLE whatsapp_sessions
ADD COLUMN IF NOT EXISTS credentials_backup JSONB DEFAULT NULL;

-- Comentario para documentar
COMMENT ON COLUMN whatsapp_sessions.credentials_backup IS 'Backup de credenciales Baileys (creds.json + signal keys) para persistencia entre reinicios de contenedor';
