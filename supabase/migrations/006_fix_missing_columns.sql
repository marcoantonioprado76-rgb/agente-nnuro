-- ============================================================
-- MIGRATION 006: Fix missing columns
-- Adds columns that the application code expects but don't exist in the DB.
-- Safe to run multiple times (uses IF NOT EXISTS / exception handling).
-- ============================================================

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

-- Done
