-- ============================================================
-- HABILITAR RLS — Solo tablas del schema de Prisma (existen garantizadas)
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Tablas core del schema de Prisma
ALTER TABLE public.profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bots                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_secrets          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_states           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_prompts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followup_settings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_orders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_logs        ENABLE ROW LEVEL SECURITY;

-- Tablas opcionales (solo si existen)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'audit_logs') THEN
    EXECUTE 'ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY';
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'admin_notifications') THEN
    EXECUTE 'ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- ============================================================
-- POLÍTICAS DE ACCESO
-- ============================================================

-- profiles: acceso total (el server usa service_role que bypasea RLS)
-- Esta política permite lectura pública para que funcionen las búsquedas de perfil
DROP POLICY IF EXISTS "profiles_service_all" ON public.profiles;
CREATE POLICY "profiles_service_all" ON public.profiles
  FOR ALL USING (true) WITH CHECK (true);

-- plans: lectura pública (se muestran en la página de pricing sin autenticación)
DROP POLICY IF EXISTS "plans_public_read" ON public.plans;
CREATE POLICY "plans_public_read" ON public.plans
  FOR SELECT USING (is_active = true);

-- system_settings: lectura pública (métodos de pago, configuración visible)
DROP POLICY IF EXISTS "settings_public_read" ON public.system_settings;
CREATE POLICY "settings_public_read" ON public.system_settings
  FOR SELECT USING (true);

-- ============================================================
-- El resto de tablas (subscriptions, payments, bots, products, etc.)
-- NO tienen políticas para anon key — solo el service_role puede acceder.
-- Esto es correcto: toda la lógica pasa por las API routes del servidor.
-- ============================================================
