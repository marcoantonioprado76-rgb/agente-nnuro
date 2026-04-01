-- ============================================================
-- MIGRATION 005: Add geolocation fields to store_orders
-- ============================================================

ALTER TABLE store_orders
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS google_maps_url TEXT;
