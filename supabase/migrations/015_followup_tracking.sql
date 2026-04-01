-- =====================================================
-- Migration 015: Tracking de seguimientos en conversations
-- Permite rastrear cuántos seguimientos se enviaron y cuándo
-- =====================================================

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS followup_count INTEGER DEFAULT 0;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_followup_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_bot_message_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_followup ON conversations(status, last_bot_message_at) WHERE status = 'pending_followup';
