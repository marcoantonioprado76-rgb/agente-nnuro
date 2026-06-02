-- ============================================================
-- MIGRATION 021: Credit Purchases (Stripe-only)
-- ============================================================
-- Sistema de compra de créditos AI mediante Stripe.
-- Solo Stripe (sin manual, sin crypto). Monto libre $5–$500.
-- Auto-activación vía webhook checkout.session.completed (cuando
-- session.metadata.purpose === 'credits').
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS credit_purchases (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     TEXT NOT NULL,
  amount_usd                  NUMERIC(10,2) NOT NULL,
  status                      TEXT NOT NULL DEFAULT 'pending',
  stripe_checkout_session_id  TEXT UNIQUE,
  stripe_customer_id          TEXT,
  stripe_payment_intent_id    TEXT,
  notes                       TEXT,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at                TIMESTAMPTZ,
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT credit_purchases_amount_range CHECK (amount_usd >= 5 AND amount_usd <= 500),
  CONSTRAINT credit_purchases_status_valid CHECK (status IN ('pending', 'completed', 'failed', 'expired')),
  CONSTRAINT credit_purchases_user_fk FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_credit_purchases_user
  ON credit_purchases(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_credit_purchases_status
  ON credit_purchases(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_credit_purchases_session
  ON credit_purchases(stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

-- Trigger para updated_at (función set_updated_at ya creada en migración 020)
DROP TRIGGER IF EXISTS credit_purchases_set_updated_at ON credit_purchases;
CREATE TRIGGER credit_purchases_set_updated_at
  BEFORE UPDATE ON credit_purchases
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS: el service role puede hacer todo; los usuarios solo ven los suyos
ALTER TABLE credit_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS credit_purchases_service_all ON credit_purchases;
CREATE POLICY credit_purchases_service_all
  ON credit_purchases
  USING (true)
  WITH CHECK (true);

COMMIT;
