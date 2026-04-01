-- ============================================================
-- MIGRATION 011: User Notifications System
-- Notifications for regular users (separate from admin_notifications)
-- ============================================================

CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  is_read BOOLEAN DEFAULT false,
  link TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_notifications_user ON user_notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notifications_unread ON user_notifications(user_id, is_read) WHERE is_read = false;

-- RLS
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- Each user can only see their own notifications
CREATE POLICY "Users can view own notifications"
  ON user_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON user_notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can insert (from API routes)
CREATE POLICY "Service role full access on user_notifications"
  ON user_notifications FOR ALL
  USING (true)
  WITH CHECK (true);
