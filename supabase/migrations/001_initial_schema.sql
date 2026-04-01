-- ============================================================
-- VENTAS EN AUTOMATICO - Database Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TENANTS
-- ============================================================
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key from tenants to profiles
ALTER TABLE tenants ADD CONSTRAINT fk_tenants_owner FOREIGN KEY (owner_id) REFERENCES profiles(id);

-- ============================================================
-- BOTS
-- ============================================================
CREATE TABLE bots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT false,
  openai_api_key TEXT,
  report_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bots_tenant ON bots(tenant_id);

-- ============================================================
-- BOT PROMPTS
-- ============================================================
CREATE TABLE bot_prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_id UUID UNIQUE NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  system_prompt TEXT NOT NULL DEFAULT '',
  personality TEXT NOT NULL DEFAULT 'Vendedor profesional, amable y persuasivo',
  sales_rules TEXT NOT NULL DEFAULT '',
  tone TEXT NOT NULL DEFAULT 'profesional y cálido',
  max_chars_per_message INTEGER DEFAULT 500,
  strict_json_output BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  benefits TEXT NOT NULL DEFAULT '',
  usage_instructions TEXT NOT NULL DEFAULT '',
  warnings TEXT NOT NULL DEFAULT '',
  currency TEXT NOT NULL DEFAULT 'USD',
  price_unit DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_promo_x2 DECIMAL(10,2),
  price_super_x6 DECIMAL(10,2),
  shipping_info TEXT NOT NULL DEFAULT '',
  coverage TEXT NOT NULL DEFAULT '',
  hooks TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_bot ON products(bot_id);
CREATE INDEX idx_products_tenant ON products(tenant_id);

-- ============================================================
-- PRODUCT IMAGES
-- ============================================================
CREATE TABLE product_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_product_images_product ON product_images(product_id);

-- ============================================================
-- PRODUCT TESTIMONIALS
-- ============================================================
CREATE TABLE product_testimonials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('image', 'video', 'text')),
  url TEXT NOT NULL DEFAULT '',
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_product_testimonials_product ON product_testimonials(product_id);

-- ============================================================
-- FOLLOWUP SETTINGS
-- ============================================================
CREATE TABLE followup_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_id UUID UNIQUE NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  first_followup_minutes INTEGER NOT NULL DEFAULT 30,
  second_followup_minutes INTEGER NOT NULL DEFAULT 1440,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- WHATSAPP SESSIONS
-- ============================================================
CREATE TABLE whatsapp_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_id UUID UNIQUE NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('disconnected', 'connecting', 'connected', 'qr_ready')),
  phone_number TEXT,
  qr_code TEXT,
  last_connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CONTACTS
-- ============================================================
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  name TEXT,
  push_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bot_id, phone)
);

CREATE INDEX idx_contacts_bot ON contacts(bot_id);
CREATE INDEX idx_contacts_phone ON contacts(phone);

-- ============================================================
-- CONVERSATIONS
-- ============================================================
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'pending_followup')),
  product_interest TEXT,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conversations_bot ON conversations(bot_id);
CREATE INDEX idx_conversations_contact ON conversations(contact_id);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at);

-- ============================================================
-- MESSAGES
-- ============================================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK (sender IN ('bot', 'client')),
  type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'audio', 'image', 'location', 'system')),
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(created_at);

-- ============================================================
-- LEADS
-- ============================================================
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'interested', 'negotiating', 'converted', 'lost')),
  product_id UUID REFERENCES products(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leads_bot ON leads(bot_id);
CREATE INDEX idx_leads_tenant ON leads(tenant_id);
CREATE INDEX idx_leads_status ON leads(status);

-- ============================================================
-- ORDERS
-- ============================================================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id),
  bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  total_amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  shipping_address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_bot ON orders(bot_id);
CREATE INDEX idx_orders_tenant ON orders(tenant_id);

-- ============================================================
-- ACTIVITY LOGS
-- ============================================================
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  bot_id UUID REFERENCES bots(id),
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_tenant ON activity_logs(tenant_id);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE followup_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Tenant isolation
CREATE POLICY "Users can view own tenant" ON tenants
  FOR ALL USING (id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (id = auth.uid() OR tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Admins can manage profiles" ON profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Bot policies
CREATE POLICY "Tenant users can view bots" ON bots
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage bots" ON bots
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Products policies
CREATE POLICY "Tenant users can view products" ON products
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage products" ON products
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Bot prompts
CREATE POLICY "Users can view bot prompts" ON bot_prompts
  FOR SELECT USING (bot_id IN (SELECT id FROM bots WHERE tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "Admins can manage bot prompts" ON bot_prompts
  FOR ALL USING (
    bot_id IN (SELECT id FROM bots WHERE tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  );

-- Followup settings
CREATE POLICY "Users can view followups" ON followup_settings
  FOR SELECT USING (bot_id IN (SELECT id FROM bots WHERE tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "Admins can manage followups" ON followup_settings
  FOR ALL USING (
    bot_id IN (SELECT id FROM bots WHERE tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  );

-- WhatsApp sessions
CREATE POLICY "Users can view wa sessions" ON whatsapp_sessions
  FOR SELECT USING (bot_id IN (SELECT id FROM bots WHERE tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "Admins can manage wa sessions" ON whatsapp_sessions
  FOR ALL USING (
    bot_id IN (SELECT id FROM bots WHERE tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  );

-- Contacts, Conversations, Messages - tenant scoped
CREATE POLICY "Tenant users can view contacts" ON contacts
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant users can view conversations" ON conversations
  FOR ALL USING (bot_id IN (SELECT id FROM bots WHERE tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "Tenant users can view messages" ON messages
  FOR ALL USING (conversation_id IN (
    SELECT id FROM conversations WHERE bot_id IN (
      SELECT id FROM bots WHERE tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    )
  ));

-- Leads & Orders
CREATE POLICY "Tenant users can view leads" ON leads
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant users can view orders" ON orders
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Product images & testimonials
CREATE POLICY "Users can view product images" ON product_images
  FOR ALL USING (product_id IN (SELECT id FROM products WHERE tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "Users can view product testimonials" ON product_testimonials
  FOR ALL USING (product_id IN (SELECT id FROM products WHERE tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())));

-- Activity logs
CREATE POLICY "Tenant users can view logs" ON activity_logs
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_tenant_id UUID;
BEGIN
  -- Create tenant for user
  INSERT INTO tenants (name, slug, owner_id)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    REPLACE(LOWER(NEW.email), '@', '-'),
    NULL
  )
  RETURNING id INTO new_tenant_id;

  -- Create profile
  INSERT INTO profiles (id, email, full_name, role, tenant_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    CASE WHEN (SELECT COUNT(*) FROM profiles) = 0 THEN 'admin' ELSE 'user' END,
    new_tenant_id
  );

  -- Update tenant owner
  UPDATE tenants SET owner_id = NEW.id WHERE id = new_tenant_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-create bot settings on bot creation
CREATE OR REPLACE FUNCTION handle_new_bot()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO bot_prompts (bot_id) VALUES (NEW.id);
  INSERT INTO followup_settings (bot_id) VALUES (NEW.id);
  INSERT INTO whatsapp_sessions (bot_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_bot_created
  AFTER INSERT ON bots
  FOR EACH ROW EXECUTE FUNCTION handle_new_bot();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_bots_updated_at BEFORE UPDATE ON bots FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_bot_prompts_updated_at BEFORE UPDATE ON bot_prompts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_followup_settings_updated_at BEFORE UPDATE ON followup_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_whatsapp_sessions_updated_at BEFORE UPDATE ON whatsapp_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
