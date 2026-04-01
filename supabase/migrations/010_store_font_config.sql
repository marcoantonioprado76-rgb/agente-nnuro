-- Add font_config column to stores table
-- Stores typography settings as JSONB: { font, weight, uppercase, letterSpacing }
ALTER TABLE stores ADD COLUMN IF NOT EXISTS font_config jsonb DEFAULT NULL;

COMMENT ON COLUMN stores.font_config IS 'Typography config for store name display: {font, weight, uppercase, letterSpacing}';
