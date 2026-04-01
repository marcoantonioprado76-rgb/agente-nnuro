-- ============================================================
-- MIGRATION 002: Stripe Integration
-- Adds Stripe fields to plans, subscriptions, payments tables
-- Creates admin_notifications table
-- ============================================================

-- ============================================================
-- 1. ADD stripe_price_id TO plans
-- ============================================================
ALTER TABLE plans ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

-- Update existing plans to only Basic and Pro with correct limits
-- First, deactivate all existing plans
UPDATE plans SET is_active = false;

-- Upsert Basic plan
INSERT INTO plans (name, slug, price, currency, max_bots, max_products, max_conversations, max_whatsapp_numbers, features, is_active, sort_order, stripe_price_id)
VALUES (
  'Basic',
  'basic',
  49,
  'USD',
  1,
  5,
  1000,
  1,
  ARRAY['1 Bot de ventas', 'Hasta 5 productos', '1,000 conversaciones/mes', '1 número de WhatsApp', 'Soporte por email'],
  true,
  1,
  NULL
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  currency = EXCLUDED.currency,
  max_bots = EXCLUDED.max_bots,
  max_products = EXCLUDED.max_products,
  max_conversations = EXCLUDED.max_conversations,
  max_whatsapp_numbers = EXCLUDED.max_whatsapp_numbers,
  features = EXCLUDED.features,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order;

-- Upsert Pro plan
INSERT INTO plans (name, slug, price, currency, max_bots, max_products, max_conversations, max_whatsapp_numbers, features, is_active, sort_order, stripe_price_id)
VALUES (
  'Pro',
  'pro',
  99,
  'USD',
  3,
  50,
  -1,
  3,
  ARRAY['Hasta 3 Bots de ventas', 'Hasta 50 productos', 'Conversaciones ilimitadas', 'Hasta 3 números de WhatsApp', 'Soporte prioritario', 'Reportes avanzados'],
  true,
  2,
  NULL
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  currency = EXCLUDED.currency,
  max_bots = EXCLUDED.max_bots,
  max_products = EXCLUDED.max_products,
  max_conversations = EXCLUDED.max_conversations,
  max_whatsapp_numbers = EXCLUDED.max_whatsapp_numbers,
  features = EXCLUDED.features,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order;

-- ============================================================
-- 2. ADD Stripe columns TO subscriptions
-- ============================================================
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT 'manual';

-- ============================================================
-- 3. ADD Stripe columns TO payments
-- ============================================================
ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- ============================================================
-- 4. CREATE admin_notifications TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  target_role TEXT DEFAULT 'admin',
  is_read BOOLEAN DEFAULT false,
  related_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  related_payment_id UUID,
  related_subscription_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast admin queries
CREATE INDEX IF NOT EXISTS idx_admin_notifications_read ON admin_notifications(is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_type ON admin_notifications(type);

-- RLS for admin_notifications
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- Admins can read all notifications
CREATE POLICY "Admins can read notifications"
  ON admin_notifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Service role can insert (from webhooks)
CREATE POLICY "Service can insert notifications"
  ON admin_notifications FOR INSERT
  WITH CHECK (true);

-- Admins can update (mark as read)
CREATE POLICY "Admins can update notifications"
  ON admin_notifications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- ============================================================
-- 5. ADD unique constraint on plans.slug if not exists
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'plans_slug_key'
  ) THEN
    ALTER TABLE plans ADD CONSTRAINT plans_slug_key UNIQUE (slug);
  END IF;
END $$;
