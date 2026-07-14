-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'READY', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'PAUSED');

-- CreateTable openai_configs
CREATE TABLE "openai_configs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "api_key_enc" TEXT NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'gpt-4o',
    "is_valid" BOOLEAN NOT NULL DEFAULT false,
    "validated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "openai_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable business_briefs
CREATE TABLE "business_briefs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "value_proposition" TEXT NOT NULL,
    "pain_points" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "brand_voice" TEXT NOT NULL DEFAULT '',
    "brand_colors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "visual_style" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "primary_objective" TEXT NOT NULL DEFAULT 'conversion',
    "main_cta" TEXT NOT NULL DEFAULT 'Comprar ahora',
    "target_locations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "key_messages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "personality_traits" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "content_themes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "engagement_level" TEXT,
    "raw_audio_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "business_briefs_pkey" PRIMARY KEY ("id")
);

-- CreateTable ad_strategies
CREATE TABLE "ad_strategies" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "platform" "AdPlatform" NOT NULL,
    "objective" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "media_type" TEXT NOT NULL,
    "media_count" INTEGER NOT NULL,
    "min_budget_usd" DOUBLE PRECISION NOT NULL,
    "advantage_type" TEXT NOT NULL,
    "is_global" BOOLEAN NOT NULL DEFAULT true,
    "user_id" UUID,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ad_strategies_pkey" PRIMARY KEY ("id")
);

-- CreateTable ad_campaigns_v2
CREATE TABLE "ad_campaigns_v2" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "brief_id" UUID NOT NULL,
    "strategy_id" UUID NOT NULL,
    "connected_account_id" UUID,
    "platform" "AdPlatform" NOT NULL,
    "name" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "daily_budget_usd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "locations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "page_id" TEXT,
    "whatsapp_number" TEXT,
    "pixel_id" TEXT,
    "destination_url" TEXT,
    "provider_campaign_id" TEXT,
    "provider_group_id" TEXT,
    "provider_ad_id" TEXT,
    "failure_reason" TEXT,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ad_campaigns_v2_pkey" PRIMARY KEY ("id")
);

-- CreateTable ad_creatives
CREATE TABLE "ad_creatives" (
    "id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "slot_index" INTEGER NOT NULL,
    "primary_text" TEXT NOT NULL DEFAULT '',
    "headline" TEXT NOT NULL DEFAULT '',
    "description" TEXT,
    "hook" TEXT,
    "media_url" TEXT,
    "media_type" TEXT,
    "ai_generated" BOOLEAN NOT NULL DEFAULT false,
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ad_creatives_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "openai_configs_user_id_key" ON "openai_configs"("user_id");
CREATE INDEX "business_briefs_user_id_is_active_idx" ON "business_briefs"("user_id", "is_active");
CREATE INDEX "ad_strategies_platform_is_active_idx" ON "ad_strategies"("platform", "is_active");
CREATE INDEX "ad_campaigns_v2_user_id_status_idx" ON "ad_campaigns_v2"("user_id", "status");
CREATE INDEX "ad_creatives_campaign_id_idx" ON "ad_creatives"("campaign_id");

-- AddForeignKey
ALTER TABLE "openai_configs" ADD CONSTRAINT "openai_configs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "business_briefs" ADD CONSTRAINT "business_briefs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ad_campaigns_v2" ADD CONSTRAINT "ad_campaigns_v2_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ad_campaigns_v2" ADD CONSTRAINT "ad_campaigns_v2_brief_id_fkey" FOREIGN KEY ("brief_id") REFERENCES "business_briefs"("id") ON UPDATE CASCADE;
ALTER TABLE "ad_campaigns_v2" ADD CONSTRAINT "ad_campaigns_v2_strategy_id_fkey" FOREIGN KEY ("strategy_id") REFERENCES "ad_strategies"("id") ON UPDATE CASCADE;
ALTER TABLE "ad_campaigns_v2" ADD CONSTRAINT "ad_campaigns_v2_connected_account_id_fkey" FOREIGN KEY ("connected_account_id") REFERENCES "ad_connected_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ad_creatives" ADD CONSTRAINT "ad_creatives_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "ad_campaigns_v2"("id") ON DELETE CASCADE ON UPDATE CASCADE;
