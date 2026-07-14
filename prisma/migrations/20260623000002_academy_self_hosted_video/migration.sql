-- Academy: videos propios en Supabase + "continuar donde quedaste"
ALTER TABLE "course_videos" ADD COLUMN IF NOT EXISTS "video_url" TEXT;
ALTER TABLE "video_progress" ADD COLUMN IF NOT EXISTS "posicion_segundos" INTEGER NOT NULL DEFAULT 0;
