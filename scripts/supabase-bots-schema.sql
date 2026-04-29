-- ============================================================
-- SCHEMA: Agente de Ventas — Bot AI Service
-- Ejecutar en Supabase SQL Editor (una sola vez)
-- ============================================================

-- 1. Tabla bots
CREATE TABLE IF NOT EXISTS bots (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name                    TEXT NOT NULL,
  type                    TEXT NOT NULL DEFAULT 'YCLOUD',
  status                  TEXT NOT NULL DEFAULT 'ACTIVE',
  webhook_token           TEXT NOT NULL,
  system_prompt_template  TEXT,
  ai_model                TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  max_chars_msg1          INT,
  max_chars_msg2          INT,
  max_chars_msg3          INT,
  follow_up1_delay        INT DEFAULT 15,
  follow_up2_delay        INT DEFAULT 4320,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla bot_secrets (credenciales cifradas)
CREATE TABLE IF NOT EXISTS bot_secrets (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id                    UUID UNIQUE NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  ycloud_api_key_enc        TEXT,
  openai_api_key_enc        TEXT,
  whatsapp_instance_number  TEXT DEFAULT '',
  report_phone              TEXT DEFAULT '',
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla conversations
CREATE TABLE IF NOT EXISTS conversations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id           UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  user_phone       TEXT NOT NULL,
  user_name        TEXT,
  sold             BOOLEAN DEFAULT FALSE,
  sold_at          TIMESTAMPTZ,
  bot_disabled     BOOLEAN DEFAULT FALSE,
  follow_up1_at    TIMESTAMPTZ,
  follow_up1_sent  BOOLEAN DEFAULT FALSE,
  follow_up2_at    TIMESTAMPTZ,
  follow_up2_sent  BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bot_id, user_phone)
);

-- 4. Tabla bot_states (estado por conversación)
CREATE TABLE IF NOT EXISTS bot_states (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID UNIQUE NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  welcome_sent     BOOLEAN DEFAULT FALSE,
  welcome_sent_at  TIMESTAMPTZ,
  last_intent      TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabla messages (historial + buffer)
CREATE TABLE IF NOT EXISTS messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role             TEXT NOT NULL,
  type             TEXT NOT NULL DEFAULT 'text',
  content          TEXT NOT NULL,
  buffered         BOOLEAN DEFAULT FALSE,
  message_id       TEXT UNIQUE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Columna para créditos de IA en profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ai_credits_usd NUMERIC DEFAULT 0;

-- 7. Tabla de configuración del sistema (para key global de OpenAI)
CREATE TABLE IF NOT EXISTS system_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Tabla de logs de uso de IA
CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES profiles(id) ON DELETE CASCADE,
  service           TEXT NOT NULL,
  model             TEXT NOT NULL,
  prompt_tokens     INT DEFAULT 0,
  completion_tokens INT DEFAULT 0,
  cost_usd          NUMERIC DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Si la tabla products ya existe pero le falta bot_id, añadirlo
ALTER TABLE products ADD COLUMN IF NOT EXISTS bot_id UUID REFERENCES bots(id) ON DELETE SET NULL;

-- 10. Columna de audio para primer mensaje (si products ya existe)
ALTER TABLE products ADD COLUMN IF NOT EXISTS first_message_audio_url TEXT;

-- 11. Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_conversations_bot_phone ON conversations(bot_id, user_phone);
CREATE INDEX IF NOT EXISTS idx_messages_conv_buffered  ON messages(conversation_id, buffered);
CREATE INDEX IF NOT EXISTS idx_messages_message_id     ON messages(message_id) WHERE message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_followup1 ON conversations(follow_up1_at) WHERE follow_up1_sent = FALSE AND sold = FALSE;
CREATE INDEX IF NOT EXISTS idx_conversations_followup2 ON conversations(follow_up2_at) WHERE follow_up2_sent = FALSE AND sold = FALSE;
CREATE INDEX IF NOT EXISTS idx_bots_tenant            ON bots(tenant_id);

-- ============================================================
-- RLS: Deshabilitar por ahora (el service role lo maneja todo)
-- Si quieres activar RLS luego, asegúrate de que el service
-- role key tenga BYPASSRLS o crear políticas adecuadas.
-- ============================================================
ALTER TABLE bots             DISABLE ROW LEVEL SECURITY;
ALTER TABLE bot_secrets      DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversations    DISABLE ROW LEVEL SECURITY;
ALTER TABLE bot_states       DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages         DISABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings  DISABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_logs    DISABLE ROW LEVEL SECURITY;
