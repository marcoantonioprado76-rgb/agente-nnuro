-- CreateTable
CREATE TABLE "reto90d_challenges" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reto90d_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reto90d_tasks" (
    "id" UUID NOT NULL,
    "challenge_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidence_type" TEXT NOT NULL,
    "expected_keywords" TEXT[],
    "points" INTEGER NOT NULL DEFAULT 10,
    "deadline_time" TEXT NOT NULL,
    "auto_approve_min" DOUBLE PRECISION NOT NULL DEFAULT 0.85,
    "requires_review" BOOLEAN NOT NULL DEFAULT false,
    "valid_examples" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reto90d_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reto90d_members" (
    "id" UUID NOT NULL,
    "challenge_id" UUID NOT NULL,
    "user_id" UUID,
    "full_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reto90d_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reto90d_submissions" (
    "id" UUID NOT NULL,
    "task_id" UUID,
    "challenge_id" UUID,
    "user_id" UUID,
    "full_name" TEXT,
    "phone" TEXT NOT NULL,
    "whatsapp_msg_id" TEXT NOT NULL,
    "media_url" TEXT,
    "media_hash" TEXT,
    "text_content" TEXT,
    "ai_task_detected" TEXT,
    "ai_confidence" DOUBLE PRECISION,
    "ai_explanation" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "points_earned" INTEGER NOT NULL DEFAULT 0,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reto90d_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reto90d_reports" (
    "id" UUID NOT NULL,
    "challenge_id" UUID NOT NULL,
    "user_id" UUID,
    "full_name" TEXT,
    "phone" TEXT NOT NULL,
    "report_date" TIMESTAMP(3) NOT NULL,
    "total_tasks" INTEGER NOT NULL,
    "completed" INTEGER NOT NULL,
    "pending" INTEGER NOT NULL,
    "rejected" INTEGER NOT NULL,
    "review" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "sent_to_user" BOOLEAN NOT NULL DEFAULT false,
    "sent_to_admin" BOOLEAN NOT NULL DEFAULT false,
    "sent_to_group" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reto90d_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reto90d_review_logs" (
    "id" UUID NOT NULL,
    "submission_id" UUID NOT NULL,
    "reviewed_by" TEXT NOT NULL,
    "previous_status" TEXT NOT NULL,
    "new_status" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reto90d_review_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reto90d_whatsapp_config" (
    "id" UUID NOT NULL,
    "challenge_id" UUID,
    "bot_id" UUID,
    "admin_phone" TEXT,
    "group_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "send_group_reports" BOOLEAN NOT NULL DEFAULT false,
    "morning_reminder_time" TEXT NOT NULL DEFAULT '09:00',
    "midday_reminder_time" TEXT NOT NULL DEFAULT '12:30',
    "afternoon_reminder_time" TEXT NOT NULL DEFAULT '17:30',
    "night_reminder_time" TEXT NOT NULL DEFAULT '21:30',
    "final_report_time" TEXT NOT NULL DEFAULT '23:50',
    "timezone" TEXT NOT NULL DEFAULT 'America/La_Paz',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reto90d_whatsapp_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reto90d_tasks_challenge_id_idx" ON "reto90d_tasks"("challenge_id");

-- CreateIndex
CREATE INDEX "reto90d_members_phone_idx" ON "reto90d_members"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "reto90d_members_challenge_id_phone_key" ON "reto90d_members"("challenge_id", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "reto90d_submissions_whatsapp_msg_id_key" ON "reto90d_submissions"("whatsapp_msg_id");

-- CreateIndex
CREATE INDEX "reto90d_submissions_phone_idx" ON "reto90d_submissions"("phone");

-- CreateIndex
CREATE INDEX "reto90d_submissions_challenge_id_idx" ON "reto90d_submissions"("challenge_id");

-- CreateIndex
CREATE INDEX "reto90d_submissions_status_idx" ON "reto90d_submissions"("status");

-- CreateIndex
CREATE INDEX "reto90d_submissions_media_hash_idx" ON "reto90d_submissions"("media_hash");

-- CreateIndex
CREATE INDEX "reto90d_reports_report_date_idx" ON "reto90d_reports"("report_date");

-- CreateIndex
CREATE UNIQUE INDEX "reto90d_reports_challenge_id_phone_report_date_key" ON "reto90d_reports"("challenge_id", "phone", "report_date");

-- CreateIndex
CREATE INDEX "reto90d_review_logs_submission_id_idx" ON "reto90d_review_logs"("submission_id");

-- AddForeignKey
ALTER TABLE "reto90d_tasks" ADD CONSTRAINT "reto90d_tasks_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "reto90d_challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reto90d_members" ADD CONSTRAINT "reto90d_members_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "reto90d_challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reto90d_submissions" ADD CONSTRAINT "reto90d_submissions_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "reto90d_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reto90d_reports" ADD CONSTRAINT "reto90d_reports_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "reto90d_challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reto90d_review_logs" ADD CONSTRAINT "reto90d_review_logs_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "reto90d_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

