-- ============================================================
-- MIGRATION 020: Stripe payments — fix schema desalineaciones
-- ============================================================
-- Resuelve el bug "Error al crear suscripción" en el flujo de pago Stripe.
--
-- Cambios (todos idempotentes y defensivos):
--   1. subscriptions.updated_at: asegurar default + trigger
--   2. payments.updated_at: agregar la columna + trigger
--   3. admin_notifications: crear si no existe o agregar campos faltantes
--      (target_user_id, related_entity_type, related_entity_id) que usa el código
--   4. Backfill defensivo de datos viejos si las columnas anteriores existen
--   5. Indexes para queries por usuario y entidad
-- ============================================================

BEGIN;

-- Función reusable para mantener updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. subscriptions.updated_at: default + trigger
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE subscriptions ALTER COLUMN updated_at SET DEFAULT now();
  END IF;
END $$;

DROP TRIGGER IF EXISTS subscriptions_set_updated_at ON subscriptions;
CREATE TRIGGER subscriptions_set_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 2. payments.updated_at
ALTER TABLE payments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
UPDATE payments SET updated_at = COALESCE(updated_at, created_at, now()) WHERE updated_at IS NULL;

DROP TRIGGER IF EXISTS payments_set_updated_at ON payments;
CREATE TRIGGER payments_set_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 3. admin_notifications: crear si no existe O agregar columnas faltantes
CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  target_user_id UUID,
  related_entity_type TEXT,
  related_entity_id UUID,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Si ya existía con shape diferente, agregar columnas faltantes
ALTER TABLE admin_notifications
  ADD COLUMN IF NOT EXISTS target_user_id UUID,
  ADD COLUMN IF NOT EXISTS related_entity_type TEXT,
  ADD COLUMN IF NOT EXISTS related_entity_id UUID,
  ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

-- 4. Backfill DEFENSIVO: solo si las columnas viejas existen
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'admin_notifications' AND column_name = 'related_subscription_id') THEN
    EXECUTE 'UPDATE admin_notifications
             SET related_entity_type = COALESCE(related_entity_type, ''subscription''),
                 related_entity_id = COALESCE(related_entity_id, related_subscription_id)
             WHERE related_subscription_id IS NOT NULL AND related_entity_id IS NULL';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'admin_notifications' AND column_name = 'related_payment_id') THEN
    EXECUTE 'UPDATE admin_notifications
             SET related_entity_type = COALESCE(related_entity_type, ''payment''),
                 related_entity_id = COALESCE(related_entity_id, related_payment_id)
             WHERE related_payment_id IS NOT NULL AND related_entity_id IS NULL';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'admin_notifications' AND column_name = 'related_user_id') THEN
    EXECUTE 'UPDATE admin_notifications
             SET target_user_id = COALESCE(target_user_id, related_user_id)
             WHERE related_user_id IS NOT NULL AND target_user_id IS NULL';
  END IF;
END $$;

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_admin_notif_target_user
  ON admin_notifications(target_user_id) WHERE target_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_admin_notif_entity
  ON admin_notifications(related_entity_type, related_entity_id)
  WHERE related_entity_id IS NOT NULL;

COMMIT;
