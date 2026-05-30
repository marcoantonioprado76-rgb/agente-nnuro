-- ============================================================
-- Tablas para Tienda Virtual — store_products + store_product_images
--
-- Estas tablas NO están en el schema de Prisma, por eso
-- `prisma db push` no las creó. Súbelo y córrelo una sola vez
-- en el SQL Editor de Supabase.
-- ============================================================

-- Asegurar extensión para gen_random_uuid() si no estaba
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────
-- store_products
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.store_products (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL,
  tenant_id   UUID NOT NULL,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'General',
  currency    TEXT NOT NULL DEFAULT 'USD',
  price       DECIMAL(10,2) NOT NULL DEFAULT 0,
  stock       INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_products_store  ON public.store_products(store_id);
CREATE INDEX IF NOT EXISTS idx_store_products_user   ON public.store_products(user_id);
CREATE INDEX IF NOT EXISTS idx_store_products_tenant ON public.store_products(tenant_id);

-- ─────────────────────────────────────────────
-- store_product_images
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.store_product_images (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,
  image_url  TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_product_images_product ON public.store_product_images(product_id);

-- ─────────────────────────────────────────────
-- RLS opcional (la app usa service_role así que esto solo
-- protege accesos directos con anon key)
-- ─────────────────────────────────────────────
ALTER TABLE public.store_products       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_product_images ENABLE ROW LEVEL SECURITY;

-- Lectura pública para mostrar productos en la vitrina pública (/tienda/[slug])
DROP POLICY IF EXISTS "store_products_public_read" ON public.store_products;
CREATE POLICY "store_products_public_read" ON public.store_products
  FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "store_product_images_public_read" ON public.store_product_images;
CREATE POLICY "store_product_images_public_read" ON public.store_product_images
  FOR SELECT USING (TRUE);
