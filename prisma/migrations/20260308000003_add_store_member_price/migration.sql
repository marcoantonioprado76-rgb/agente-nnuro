-- Add member_price column to store_items
ALTER TABLE store_items ADD COLUMN IF NOT EXISTS member_price NUMERIC(10,2);
