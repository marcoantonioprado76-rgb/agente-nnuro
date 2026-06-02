-- ============================================================
-- MIGRATION 022: Plans & Credits Architecture
-- ============================================================
-- Rearquitectura del módulo de suscripciones:
--   1. Agrega ~20 columnas a plans (mensual/trimestral/anual,
--      promociones, créditos mensuales, todos los límites).
--   2. Agrega columnas a subscriptions (billing_period, recharge dates,
--      auto_renew, price_paid).
--   3. Agrega columnas a profiles para el nuevo modelo de créditos
--      (separar included vs additional vs used).
--   4. Crea tabla credit_movements (ledger).
--   5. Crea tabla credit_packages (paquetes adicionales).
--   6. Seed/UPDATE de los 4 planes con valores correctos del brief.
--   7. Seed de 4 paquetes iniciales.
--
-- Compatibilidad backward: TODAS las columnas nuevas tienen DEFAULT.
-- No se rompe nada existente. ai_credits_usd se mantiene intacto
-- (se migrará al nuevo modelo en una fase posterior).
-- ============================================================

BEGIN;

-- ============================================================
-- 1. PLANS — extensión de columnas
-- ============================================================

ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS monthly_price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS quarterly_price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS annual_price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS quarterly_full_price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS annual_full_price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS quarterly_discount_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS annual_discount_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS included_monthly_ai_credits INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS included_monthly_ai_budget_usd NUMERIC(10,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credit_usd_conversion_rate NUMERIC(10,4) NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS max_ai_agents INTEGER,
  ADD COLUMN IF NOT EXISTS max_virtual_stores INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_monthly_contacts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_monthly_conversations INTEGER,
  ADD COLUMN IF NOT EXISTS max_team_members INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS promotion_label TEXT,
  ADD COLUMN IF NOT EXISTS promotion_start_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS promotion_end_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_promotion_active BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_duration_days INTEGER,
  ADD COLUMN IF NOT EXISTS show_nuro_branding BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS stripe_quarterly_price_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_annual_price_id TEXT;

-- Backfill: si no había monthly_price, copiar de la columna price existente
UPDATE plans SET monthly_price = price WHERE monthly_price IS NULL;

-- Backfill: max_ai_agents ← max_bots, max_monthly_conversations ← max_conversations
UPDATE plans SET max_ai_agents = max_bots WHERE max_ai_agents IS NULL;
UPDATE plans SET max_monthly_conversations = max_conversations WHERE max_monthly_conversations IS NULL;

-- Constraint para billing periods válidos al momento de seleccionar el plan
-- (no aplicado aquí, se aplica vía CHECK en subscriptions.billing_period)

-- ============================================================
-- 2. SUBSCRIPTIONS — nuevos campos para billing periods
-- ============================================================

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS billing_period TEXT NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS next_credit_recharge_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_renew_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS price_paid NUMERIC(10,2);

-- Constraint para billing_period
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_billing_period_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_billing_period_check
  CHECK (billing_period IN ('monthly', 'quarterly', 'annual', 'trial'));

-- ============================================================
-- 3. PROFILES — separación de balances de créditos
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS included_credits_balance INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS additional_credits_balance INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credits_used_current_cycle INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_credit_recharge_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_credit_recharge_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accumulate_unused_credits BOOLEAN NOT NULL DEFAULT false;

-- ============================================================
-- 4. credit_movements (ledger de cada recarga/consumo/ajuste)
-- ============================================================

CREATE TABLE IF NOT EXISTS credit_movements (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  TEXT NOT NULL,
  movement_type            TEXT NOT NULL,
  amount                   INTEGER NOT NULL,
  balance_before           INTEGER NOT NULL,
  balance_after            INTEGER NOT NULL,
  source                   TEXT,
  related_subscription_id  UUID,
  related_conversation_id  TEXT,
  related_agent_id         TEXT,
  related_package_id       UUID,
  related_ai_usage_log_id  TEXT,
  idempotency_key          TEXT,
  description              TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT credit_movements_user_fk
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,

  CONSTRAINT credit_movements_type_valid CHECK (movement_type IN (
    'recharge_included',   -- recarga mensual del plan
    'recharge_additional', -- compra de paquete adicional
    'consumption',         -- descuento por uso de IA
    'adjustment_admin',    -- ajuste manual del admin
    'expiration',          -- créditos vencidos
    'refund',              -- devolución
    'migration'            -- carga inicial desde ai_credits_usd legacy
  ))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_movements_idempotency
  ON credit_movements(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_credit_movements_user
  ON credit_movements(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_credit_movements_type
  ON credit_movements(movement_type, created_at DESC);

-- RLS
ALTER TABLE credit_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS credit_movements_service_all ON credit_movements;
CREATE POLICY credit_movements_service_all
  ON credit_movements
  USING (true) WITH CHECK (true);

-- ============================================================
-- 5. credit_packages (paquetes adicionales configurables)
-- ============================================================

CREATE TABLE IF NOT EXISTS credit_packages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  credits_amount    INTEGER NOT NULL,
  price_usd         NUMERIC(10,2) NOT NULL,
  expiration_days   INTEGER,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  description       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT credit_packages_credits_positive CHECK (credits_amount > 0),
  CONSTRAINT credit_packages_price_positive CHECK (price_usd > 0)
);

DROP TRIGGER IF EXISTS credit_packages_set_updated_at ON credit_packages;
CREATE TRIGGER credit_packages_set_updated_at
  BEFORE UPDATE ON credit_packages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_credit_packages_active
  ON credit_packages(is_active, sort_order);

ALTER TABLE credit_packages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS credit_packages_service_all ON credit_packages;
CREATE POLICY credit_packages_service_all
  ON credit_packages
  USING (true) WITH CHECK (true);

-- ============================================================
-- 6. SEED / UPDATE de los 4 planes
-- ============================================================
-- Conversion: $1 USD = 100 credits (default credit_usd_conversion_rate)
-- Cálculo: included_monthly_ai_credits = included_monthly_ai_budget_usd × 100

-- ── PLAN: Prueba Gratuita (TRIAL) ──
INSERT INTO plans (
  id, name, slug, price,
  monthly_price, quarterly_price, annual_price,
  max_bots, max_ai_agents, max_whatsapp_numbers, max_virtual_stores,
  max_products, max_monthly_contacts, max_conversations, max_monthly_conversations,
  max_team_members,
  included_monthly_ai_credits, included_monthly_ai_budget_usd,
  trial_duration_days,
  show_nuro_branding,
  features, is_active, sort_order
) VALUES (
  'plan_trial_0007_2026',
  'Prueba Gratuita',
  'trial',
  0,
  0, 0, 0,
  1, 1, 1, 1,
  10, 100, 300, 300,
  1,
  50, 0.50,
  7,
  true,
  ARRAY[
    '7 días gratis',
    '1 Agente IA',
    '1 número de WhatsApp',
    '1 tienda virtual',
    '10 productos máximos',
    '100 contactos atendidos',
    '300 conversaciones',
    '50 créditos de IA',
    'Marca NÜRO visible'
  ],
  true,
  0
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  monthly_price = EXCLUDED.monthly_price,
  quarterly_price = EXCLUDED.quarterly_price,
  annual_price = EXCLUDED.annual_price,
  max_bots = EXCLUDED.max_bots,
  max_ai_agents = EXCLUDED.max_ai_agents,
  max_whatsapp_numbers = EXCLUDED.max_whatsapp_numbers,
  max_virtual_stores = EXCLUDED.max_virtual_stores,
  max_products = EXCLUDED.max_products,
  max_monthly_contacts = EXCLUDED.max_monthly_contacts,
  max_conversations = EXCLUDED.max_conversations,
  max_monthly_conversations = EXCLUDED.max_monthly_conversations,
  max_team_members = EXCLUDED.max_team_members,
  included_monthly_ai_credits = EXCLUDED.included_monthly_ai_credits,
  included_monthly_ai_budget_usd = EXCLUDED.included_monthly_ai_budget_usd,
  trial_duration_days = EXCLUDED.trial_duration_days,
  show_nuro_branding = EXCLUDED.show_nuro_branding,
  features = EXCLUDED.features,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order;

-- ── PLAN: Básico ──
UPDATE plans SET
  name = 'Básico',
  price = 39,
  monthly_price = 39,
  quarterly_price = 99,
  quarterly_full_price = 117,
  quarterly_discount_amount = 18,
  annual_price = 348,
  annual_full_price = 468,
  annual_discount_amount = 120,
  max_bots = 1, max_ai_agents = 1,
  max_whatsapp_numbers = 1, max_virtual_stores = 1,
  max_products = 50,
  max_monthly_contacts = 2000,
  max_conversations = 6000, max_monthly_conversations = 6000,
  max_team_members = 1,
  included_monthly_ai_credits = 400,
  included_monthly_ai_budget_usd = 4.00,
  credit_usd_conversion_rate = 100,
  show_nuro_branding = true,
  is_featured = false,
  features = ARRAY[
    '1 Agente IA',
    '1 número de WhatsApp',
    '1 tienda virtual',
    '50 productos máximos',
    '2,000 contactos atendidos/mes',
    '6,000 conversaciones/mes',
    '400 créditos mensuales de IA',
    'Seguimientos automáticos básicos',
    'Panel de oportunidades y ventas',
    'Reportes básicos',
    'Soporte estándar'
  ],
  is_active = true,
  sort_order = 1
WHERE slug = 'basico';

-- ── PLAN: Profesional (FEATURED) ──
UPDATE plans SET
  name = 'Profesional',
  price = 59,
  monthly_price = 59,
  quarterly_price = 149,
  quarterly_full_price = 177,
  quarterly_discount_amount = 28,
  annual_price = 528,
  annual_full_price = 708,
  annual_discount_amount = 180,
  max_bots = 3, max_ai_agents = 3,
  max_whatsapp_numbers = 3, max_virtual_stores = 3,
  max_products = 200,
  max_monthly_contacts = 8000,
  max_conversations = 25000, max_monthly_conversations = 25000,
  max_team_members = 3,
  included_monthly_ai_credits = 700,
  included_monthly_ai_budget_usd = 7.00,
  credit_usd_conversion_rate = 100,
  show_nuro_branding = false,
  is_featured = true,
  promotion_label = 'MÁS RECOMENDADO',
  is_promotion_active = true,
  features = ARRAY[
    '3 Agentes IA',
    '3 números de WhatsApp',
    '3 tiendas virtuales',
    '200 productos máximos',
    '8,000 contactos atendidos/mes',
    '25,000 conversaciones/mes',
    '700 créditos mensuales de IA',
    'Seguimientos automáticos avanzados',
    'Dominio personalizado',
    'Sin marca NÜRO',
    'Reportes avanzados',
    'Soporte prioritario'
  ],
  is_active = true,
  sort_order = 2
WHERE slug = 'profesional';

-- ── PLAN: Empresarial ──
UPDATE plans SET
  name = 'Empresarial',
  price = 99,
  monthly_price = 99,
  quarterly_price = 249,
  quarterly_full_price = 297,
  quarterly_discount_amount = 48,
  annual_price = 888,
  annual_full_price = 1188,
  annual_discount_amount = 300,
  max_bots = 8, max_ai_agents = 8,
  max_whatsapp_numbers = 8, max_virtual_stores = 8,
  max_products = 1000,
  max_monthly_contacts = 25000,
  max_conversations = 80000, max_monthly_conversations = 80000,
  max_team_members = 10,
  included_monthly_ai_credits = 1600,
  included_monthly_ai_budget_usd = 16.00,
  credit_usd_conversion_rate = 100,
  show_nuro_branding = false,
  is_featured = false,
  features = ARRAY[
    '8 Agentes IA',
    '8 números de WhatsApp',
    '8 tiendas virtuales',
    '1,000 productos máximos',
    '25,000 contactos atendidos/mes',
    '80,000 conversaciones/mes',
    '1,600 créditos mensuales de IA',
    'Seguimientos automáticos avanzados',
    'Dominios personalizados',
    'Sin marca NÜRO',
    'Analítica avanzada',
    'Exportación de reportes',
    'Soporte prioritario',
    'Configuración inicial asistida'
  ],
  is_active = true,
  sort_order = 3
WHERE slug = 'empresarial';

-- ============================================================
-- 7. SEED de los 4 paquetes iniciales de créditos
-- ============================================================

INSERT INTO credit_packages (name, credits_amount, price_usd, expiration_days, is_active, sort_order, description)
VALUES
  ('Paquete Inicial',     500,   5.00,  NULL, true, 1, 'Para comenzar — créditos suficientes para días intensos'),
  ('Paquete Crecimiento', 1500,  14.00, NULL, true, 2, '6% de descuento vs precio unitario'),
  ('Paquete Campañas',    5000,  45.00, NULL, true, 3, '10% de descuento — ideal para campañas'),
  ('Paquete Alto Volumen',10000, 85.00, NULL, true, 4, '15% de descuento — máximo ahorro')
ON CONFLICT DO NOTHING;

COMMIT;

-- ============================================================
-- VERIFICACIÓN — corre estas queries para confirmar
-- ============================================================
-- SELECT name, slug, monthly_price, quarterly_price, annual_price,
--        included_monthly_ai_credits, max_products, max_monthly_contacts,
--        max_monthly_conversations, max_team_members,
--        is_featured, promotion_label
-- FROM plans ORDER BY sort_order;
--
-- SELECT name, credits_amount, price_usd, is_active
-- FROM credit_packages ORDER BY sort_order;
