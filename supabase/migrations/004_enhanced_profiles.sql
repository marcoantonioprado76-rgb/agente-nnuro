-- ============================================================
-- 004 - Enhanced Profiles + Admin Notifications
-- ============================================================

-- 1. Add missing columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country TEXT DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city TEXT DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_number TEXT DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_with_code TEXT DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS transaction_password_hash TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS login_provider TEXT DEFAULT 'email' CHECK (login_provider IN ('email', 'google'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'blocked'));

-- 2. Admin Notifications
CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  related_entity_type TEXT,
  related_entity_id UUID,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_read ON admin_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created ON admin_notifications(created_at DESC);

ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- Only admins can access notifications (via service role or is_admin)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin') THEN
    EXECUTE 'CREATE POLICY "admin_notifications_admin_all" ON admin_notifications FOR ALL USING (public.is_admin())';
  END IF;
END;
$$;

-- 3. Helper function to create admin notifications
CREATE OR REPLACE FUNCTION create_admin_notification(
  p_type TEXT,
  p_title TEXT,
  p_message TEXT DEFAULT '',
  p_target_user_id UUID DEFAULT NULL,
  p_related_entity_type TEXT DEFAULT NULL,
  p_related_entity_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO admin_notifications (type, title, message, target_user_id, related_entity_type, related_entity_id)
  VALUES (p_type, p_title, p_message, p_target_user_id, p_related_entity_type, p_related_entity_id)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
