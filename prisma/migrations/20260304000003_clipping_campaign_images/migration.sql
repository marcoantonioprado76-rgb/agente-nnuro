-- Add image_urls array column to clipping_campaigns
ALTER TABLE clipping_campaigns ADD COLUMN IF NOT EXISTS image_urls TEXT[] NOT NULL DEFAULT '{}';
