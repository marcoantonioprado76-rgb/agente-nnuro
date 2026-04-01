-- ============================================================
-- COMBINED MIGRATIONS 006 + 007 + 008
-- Run this in the Supabase Dashboard SQL Editor:
-- https://supabase.com/dashboard/project/lbrfqtfhmgvlsjpvqnlu/sql/new
-- ============================================================

-- ============ MIGRATION 006: Fix missing columns ============

-- 1. plans: add stripe_price_id
DO $$ BEGIN
  ALTER TABLE plans ADD COLUMN stripe_price_id text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 2. subscriptions: add Stripe-specific columns
DO $$ BEGIN
  ALTER TABLE subscriptions ADD COLUMN stripe_customer_id text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE subscriptions ADD COLUMN stripe_checkout_session_id text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 3. payments: add Stripe-specific columns
DO $$ BEGIN
  ALTER TABLE payments ADD COLUMN stripe_payment_intent_id text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE payments ADD COLUMN stripe_checkout_session_id text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE payments ADD COLUMN stripe_customer_id text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ============ MIGRATION 007: GPT model + per-message limits ============

-- 1. bots: add gpt_model column
DO $$ BEGIN
  ALTER TABLE bots ADD COLUMN gpt_model text NOT NULL DEFAULT 'gpt-5.1';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 2. bot_prompts: add per-message character limits
DO $$ BEGIN
  ALTER TABLE bot_prompts ADD COLUMN max_chars_message1 integer NOT NULL DEFAULT 500;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE bot_prompts ADD COLUMN max_chars_message2 integer NOT NULL DEFAULT 300;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE bot_prompts ADD COLUMN max_chars_message3 integer NOT NULL DEFAULT 200;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Migrate existing max_chars_per_message value to message1
UPDATE bot_prompts
  SET max_chars_message1 = COALESCE(max_chars_per_message, 500)
  WHERE max_chars_message1 = 500
    AND max_chars_per_message IS NOT NULL
    AND max_chars_per_message != 500;

-- ============ MIGRATION 008: Enhanced Products ============

-- 1. products: add new fields
DO $$ BEGIN ALTER TABLE products ADD COLUMN category text NOT NULL DEFAULT ''; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE products ADD COLUMN first_message text NOT NULL DEFAULT ''; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE products ADD COLUMN offer_price numeric(12,2) DEFAULT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE products ADD COLUMN delivery_zones text NOT NULL DEFAULT ''; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE products ADD COLUMN sell_zones text NOT NULL DEFAULT ''; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- 2. product_images: add image_type
DO $$ BEGIN
  ALTER TABLE product_images ADD COLUMN image_type text NOT NULL DEFAULT 'product';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE product_images ADD CONSTRAINT product_images_type_check CHECK (image_type IN ('product', 'offer'));
EXCEPTION WHEN duplicate_constraint THEN NULL;
END $$;

-- 3. product_testimonials: add description
DO $$ BEGIN
  ALTER TABLE product_testimonials ADD COLUMN description text DEFAULT '';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ============ VERIFICATION ============
SELECT 'MIGRATION COMPLETE' as status;
