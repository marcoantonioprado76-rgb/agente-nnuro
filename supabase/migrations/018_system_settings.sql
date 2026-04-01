-- 018 - System Settings (configuraciones globales del sistema)
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden leer y escribir
CREATE POLICY "Admins can manage system settings"
  ON system_settings FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Valores por defecto
INSERT INTO system_settings (key, value) VALUES
  ('payment_methods', '{"stripe": true, "transfer": true}')
ON CONFLICT (key) DO NOTHING;
