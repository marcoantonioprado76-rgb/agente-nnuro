-- ============================================================
-- Tablas adicionales que la app referencia pero NO están en el
-- schema de Prisma, así que `prisma db push` no las creó.
--
-- Ejecutar UNA VEZ en el SQL Editor de Supabase. Es idempotente
-- (CREATE TABLE IF NOT EXISTS) — no rompe si ya existen.
--
-- Columnas usan TEXT para id porque el resto de la BD también
-- (Prisma db push mapea String → TEXT, no UUID).
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────
-- admin_notifications
-- Usada por: notificaciones del admin, stripe webhook,
-- stripe verify, cron de suscripciones vencidas.
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id                   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  type                 TEXT NOT NULL,
  title                TEXT NOT NULL,
  message              TEXT NOT NULL,
  target_user_id       TEXT,
  related_entity_type  TEXT,
  related_entity_id    TEXT,
  is_read              BOOLEAN NOT NULL DEFAULT FALSE,
  metadata             JSONB,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at              TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_unread     ON public.admin_notifications(is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON public.admin_notifications(created_at DESC);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────
-- audit_logs
-- Usada por: lib/audit.ts (registro de auditoría).
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id      TEXT,
  tenant_id    TEXT,
  action       TEXT NOT NULL,
  entity_type  TEXT,
  entity_id    TEXT,
  details      JSONB,
  ip_address   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id    ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id  ON public.audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
