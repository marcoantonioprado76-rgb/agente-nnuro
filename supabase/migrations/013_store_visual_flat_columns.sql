-- ============================================================
-- MIGRATION 013: Store Visual Customization (flat columns)
-- Adds dedicated text columns for font and background settings
-- so the public store page can render them without parsing JSONB.
-- ============================================================

ALTER TABLE stores ADD COLUMN IF NOT EXISTS font_family TEXT DEFAULT NULL;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS font_weight TEXT DEFAULT '700';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS font_spacing TEXT DEFAULT 'normal';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS font_style TEXT DEFAULT NULL;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS background_type TEXT DEFAULT 'solid';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS background_value TEXT DEFAULT '#0F172A';

COMMENT ON COLUMN stores.font_family IS 'Google Font family name e.g. Montserrat, Playfair Display';
COMMENT ON COLUMN stores.font_weight IS 'CSS font-weight: 400, 500, 600, 700';
COMMENT ON COLUMN stores.font_spacing IS 'Letter spacing: normal, wide, wider, ultra';
COMMENT ON COLUMN stores.font_style IS 'Text style: uppercase or null';
COMMENT ON COLUMN stores.background_type IS 'solid or gradient';
COMMENT ON COLUMN stores.background_value IS 'CSS color (#hex) or linear-gradient(...)';

-- Backfill existing stores from JSONB configs
UPDATE stores SET
  font_family = CASE
    WHEN font_config->>'font' = 'playfair' THEN 'Playfair Display'
    WHEN font_config->>'font' = 'montserrat' THEN 'Montserrat'
    WHEN font_config->>'font' = 'inter' THEN 'Inter'
    WHEN font_config->>'font' = 'poppins' THEN 'Poppins'
    ELSE font_config->>'font'
  END,
  font_weight = COALESCE(font_config->>'weight', '700'),
  font_spacing = COALESCE(font_config->>'letterSpacing', 'normal'),
  font_style = CASE WHEN (font_config->>'uppercase')::boolean THEN 'uppercase' ELSE NULL END,
  background_type = COALESCE(bg_config->>'type', 'solid'),
  background_value = CASE
    WHEN bg_config->>'type' = 'gradient' THEN bg_config->>'gradient'
    ELSE COALESCE(bg_config->>'color', '#0F172A')
  END
WHERE font_config IS NOT NULL AND font_family IS NULL;
