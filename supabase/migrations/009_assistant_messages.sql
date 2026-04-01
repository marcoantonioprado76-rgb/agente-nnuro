-- Tabla para historial de conversación del asistente IA por usuario
CREATE TABLE IF NOT EXISTS assistant_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para consultas rápidas por usuario
CREATE INDEX IF NOT EXISTS idx_assistant_messages_user_id ON assistant_messages(user_id, created_at DESC);

-- RLS
ALTER TABLE assistant_messages ENABLE ROW LEVEL SECURITY;

-- Cada usuario solo ve sus propios mensajes
CREATE POLICY "Users can view own assistant messages"
  ON assistant_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own assistant messages"
  ON assistant_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role puede hacer todo (para la API)
CREATE POLICY "Service role full access on assistant_messages"
  ON assistant_messages FOR ALL
  USING (true)
  WITH CHECK (true);
