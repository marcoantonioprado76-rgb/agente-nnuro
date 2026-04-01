-- ============================================================
-- MIGRATION 008: Enhanced Products for Bot Sales Database
-- ============================================================

-- 1. products: add new fields
DO $$ BEGIN ALTER TABLE products ADD COLUMN category text NOT NULL DEFAULT ''; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE products ADD COLUMN first_message text NOT NULL DEFAULT ''; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE products ADD COLUMN offer_price numeric(12,2) DEFAULT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE products ADD COLUMN delivery_zones text NOT NULL DEFAULT ''; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE products ADD COLUMN sell_zones text NOT NULL DEFAULT ''; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- 2. product_images: add image_type to distinguish product vs offer images
DO $$ BEGIN
  ALTER TABLE product_images ADD COLUMN image_type text NOT NULL DEFAULT 'product';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Add constraint for valid image types
DO $$ BEGIN
  ALTER TABLE product_images ADD CONSTRAINT product_images_type_check CHECK (image_type IN ('product', 'offer'));
EXCEPTION WHEN duplicate_constraint THEN NULL;
END $$;

-- 3. product_testimonials: ensure description field exists
DO $$ BEGIN
  ALTER TABLE product_testimonials ADD COLUMN description text DEFAULT '';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
