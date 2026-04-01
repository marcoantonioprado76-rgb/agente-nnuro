-- Add bg_config column to stores table
-- Stores background/theme settings as JSONB: { type, color, gradient }
ALTER TABLE stores ADD COLUMN IF NOT EXISTS bg_config jsonb DEFAULT NULL;

COMMENT ON COLUMN stores.bg_config IS 'Background config for store: {type: "solid"|"gradient", color: "#hex", gradient: "css-gradient-string"}';
