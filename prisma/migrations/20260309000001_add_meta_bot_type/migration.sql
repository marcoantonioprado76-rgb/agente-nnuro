-- Add META value to BotType enum
ALTER TYPE "BotType" ADD VALUE IF NOT EXISTS 'META';

-- Add meta_page_token_enc column to bot_secrets
ALTER TABLE bot_secrets ADD COLUMN IF NOT EXISTS meta_page_token_enc TEXT;
