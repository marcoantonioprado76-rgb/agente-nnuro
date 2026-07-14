-- Add welcome_message to ad_campaigns_v2
ALTER TABLE "ad_campaigns_v2" ADD COLUMN IF NOT EXISTS "welcome_message" TEXT;
