CREATE TABLE IF NOT EXISTS "video_progress" (
  "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id"    UUID NOT NULL,
  "video_id"   UUID NOT NULL,
  "course_id"  UUID NOT NULL,
  "completed"  BOOLEAN NOT NULL DEFAULT false,
  "percent"    INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "video_progress_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "video_progress_user_video_unique" UNIQUE ("user_id", "video_id")
);

CREATE INDEX IF NOT EXISTS "video_progress_user_course_idx" ON "video_progress"("user_id", "course_id");
