-- CreateEnum
CREATE TYPE "ClippingPlatform" AS ENUM ('YOUTUBE', 'TIKTOK');

-- CreateEnum
CREATE TYPE "ClippingAccountStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('HOLD', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "clipping_campaigns" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "description" TEXT,
    "platform" "ClippingPlatform" NOT NULL,
    "cpm_usd" DECIMAL(10,4) NOT NULL,
    "hold_hours" INTEGER NOT NULL DEFAULT 48,
    "min_views" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "ends_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clipping_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clipping_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "platform" "ClippingPlatform" NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "display_name" TEXT,
    "access_token_enc" TEXT NOT NULL,
    "refresh_token_enc" TEXT,
    "expires_at" TIMESTAMP(3),
    "status" "ClippingAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clipping_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clipping_submissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "platform" "ClippingPlatform" NOT NULL,
    "video_id" TEXT NOT NULL,
    "video_url" TEXT NOT NULL,
    "video_title" TEXT,
    "base_views" INTEGER NOT NULL DEFAULT 0,
    "current_views" INTEGER NOT NULL DEFAULT 0,
    "delta_views" INTEGER NOT NULL DEFAULT 0,
    "earnings_usd" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'HOLD',
    "hold_until" TIMESTAMP(3) NOT NULL,
    "approved_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "last_sync_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clipping_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clipping_snapshots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "submission_id" UUID NOT NULL,
    "views" INTEGER NOT NULL,
    "taken_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clipping_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clipping_payouts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "submission_id" UUID,
    "amount_usd" DECIMAL(12,4) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clipping_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clipping_accounts_user_id_platform_key" ON "clipping_accounts"("user_id", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "clipping_submissions_campaign_id_video_id_key" ON "clipping_submissions"("campaign_id", "video_id");

-- CreateIndex
CREATE INDEX "clipping_submissions_user_id_status_idx" ON "clipping_submissions"("user_id", "status");

-- CreateIndex
CREATE INDEX "clipping_snapshots_submission_id_taken_at_idx" ON "clipping_snapshots"("submission_id", "taken_at");

-- CreateIndex
CREATE INDEX "clipping_payouts_user_id_idx" ON "clipping_payouts"("user_id");

-- AddForeignKey
ALTER TABLE "clipping_accounts" ADD CONSTRAINT "clipping_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clipping_submissions" ADD CONSTRAINT "clipping_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clipping_submissions" ADD CONSTRAINT "clipping_submissions_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "clipping_campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clipping_submissions" ADD CONSTRAINT "clipping_submissions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "clipping_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clipping_snapshots" ADD CONSTRAINT "clipping_snapshots_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "clipping_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clipping_payouts" ADD CONSTRAINT "clipping_payouts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
