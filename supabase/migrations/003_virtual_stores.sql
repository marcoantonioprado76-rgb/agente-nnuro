-- ============================================================
-- 003 - VIRTUAL STORES (Complete Migration)
-- ============================================================

-- ============================================================
-- 1. STORES
-- ============================================================

CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  bot_id UUID REFERENCES bots(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  store_type TEXT NOT NULL DEFAULT 'business' CHECK (store_type IN ('business', 'network_marketing')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
  whatsapp_number TEXT,
  payment_qr_url TEXT,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_stores_slug ON stores(slug);
CREATE INDEX IF NOT EXISTS idx_stores_user ON stores(user_id);
CREATE INDEX IF NOT EXISTS idx_stores_tenant ON stores(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stores_bot ON stores(bot_id);

-- ============================================================
-- 2. STORE CATEGORIES
-- ============================================================

CREATE TABLE IF NOT EXISTS store_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_store_categories_store ON store_categories(store_id);

-- ============================================================
-- 3. STORE PRODUCTS
-- ============================================================

CREATE TABLE IF NOT EXISTS store_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category_id UUID REFERENCES store_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  currency TEXT NOT NULL DEFAULT 'USD',
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_products_store ON store_products(store_id);
CREATE INDEX IF NOT EXISTS idx_store_products_user ON store_products(user_id);
CREATE INDEX IF NOT EXISTS idx_store_products_tenant ON store_products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_store_products_category ON store_products(category_id);

-- ============================================================
-- 4. STORE PRODUCT IMAGES
-- ============================================================

CREATE TABLE IF NOT EXISTS store_product_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES store_products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_product_images_product ON store_product_images(product_id);

-- ============================================================
-- 5. STORE ORDERS
-- ============================================================

CREATE TABLE IF NOT EXISTS store_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id UUID REFERENCES store_products(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_name TEXT,
  customer_phone TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  source TEXT NOT NULL DEFAULT 'whatsapp' CHECK (source IN ('whatsapp', 'web', 'manual')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_orders_store ON store_orders(store_id);
CREATE INDEX IF NOT EXISTS idx_store_orders_user ON store_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_store_orders_tenant ON store_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_store_orders_status ON store_orders(status);
CREATE INDEX IF NOT EXISTS idx_store_orders_product ON store_orders(product_id);

-- ============================================================
-- 6. UPDATED_AT TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_stores_updated_at') THEN
    CREATE TRIGGER trigger_stores_updated_at
      BEFORE UPDATE ON stores
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_store_categories_updated_at') THEN
    CREATE TRIGGER trigger_store_categories_updated_at
      BEFORE UPDATE ON store_categories
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_store_products_updated_at') THEN
    CREATE TRIGGER trigger_store_products_updated_at
      BEFORE UPDATE ON store_products
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_store_orders_updated_at') THEN
    CREATE TRIGGER trigger_store_orders_updated_at
      BEFORE UPDATE ON store_orders
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END;
$$;

-- ============================================================
-- 7. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_orders ENABLE ROW LEVEL SECURITY;

-- ----- STORES -----
CREATE POLICY "stores_select_own" ON stores FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "stores_insert_own" ON stores FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "stores_update_own" ON stores FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "stores_delete_own" ON stores FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "stores_select_public" ON stores FOR SELECT USING (visibility = 'public' AND is_active = true);

-- ----- STORE CATEGORIES -----
CREATE POLICY "store_categories_select_own" ON store_categories FOR SELECT
  USING (EXISTS (SELECT 1 FROM stores WHERE stores.id = store_categories.store_id AND stores.user_id = auth.uid()));
CREATE POLICY "store_categories_insert_own" ON store_categories FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM stores WHERE stores.id = store_categories.store_id AND stores.user_id = auth.uid()));
CREATE POLICY "store_categories_update_own" ON store_categories FOR UPDATE
  USING (EXISTS (SELECT 1 FROM stores WHERE stores.id = store_categories.store_id AND stores.user_id = auth.uid()));
CREATE POLICY "store_categories_delete_own" ON store_categories FOR DELETE
  USING (EXISTS (SELECT 1 FROM stores WHERE stores.id = store_categories.store_id AND stores.user_id = auth.uid()));

-- ----- STORE PRODUCTS -----
CREATE POLICY "store_products_select_own" ON store_products FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "store_products_insert_own" ON store_products FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "store_products_update_own" ON store_products FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "store_products_delete_own" ON store_products FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "store_products_select_public" ON store_products FOR SELECT
  USING (EXISTS (SELECT 1 FROM stores WHERE stores.id = store_products.store_id AND stores.visibility = 'public' AND stores.is_active = true));

-- ----- STORE PRODUCT IMAGES -----
CREATE POLICY "store_product_images_select_own" ON store_product_images FOR SELECT
  USING (EXISTS (SELECT 1 FROM store_products WHERE store_products.id = store_product_images.product_id AND store_products.user_id = auth.uid()));
CREATE POLICY "store_product_images_insert_own" ON store_product_images FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM store_products WHERE store_products.id = store_product_images.product_id AND store_products.user_id = auth.uid()));
CREATE POLICY "store_product_images_delete_own" ON store_product_images FOR DELETE
  USING (EXISTS (SELECT 1 FROM store_products WHERE store_products.id = store_product_images.product_id AND store_products.user_id = auth.uid()));
CREATE POLICY "store_product_images_select_public" ON store_product_images FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM store_products sp
    JOIN stores s ON s.id = sp.store_id
    WHERE sp.id = store_product_images.product_id AND s.visibility = 'public' AND s.is_active = true
  ));

-- ----- STORE ORDERS -----
CREATE POLICY "store_orders_select_own" ON store_orders FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "store_orders_insert_own" ON store_orders FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "store_orders_update_own" ON store_orders FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "store_orders_delete_own" ON store_orders FOR DELETE USING (user_id = auth.uid());

-- ----- ADMIN ACCESS (via is_admin function) -----
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin') THEN
    EXECUTE 'CREATE POLICY "stores_admin_all" ON stores FOR ALL USING (public.is_admin())';
    EXECUTE 'CREATE POLICY "store_categories_admin_all" ON store_categories FOR ALL USING (public.is_admin())';
    EXECUTE 'CREATE POLICY "store_products_admin_all" ON store_products FOR ALL USING (public.is_admin())';
    EXECUTE 'CREATE POLICY "store_product_images_admin_all" ON store_product_images FOR ALL USING (public.is_admin())';
    EXECUTE 'CREATE POLICY "store_orders_admin_all" ON store_orders FOR ALL USING (public.is_admin())';
  END IF;
END;
$$;
