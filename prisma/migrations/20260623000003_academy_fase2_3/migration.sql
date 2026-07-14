-- Academy Fase 2/3: preview, notas, duración, recursos por lección, categoría/nivel del curso
ALTER TABLE "course_videos" ADD COLUMN IF NOT EXISTS "preview" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "course_videos" ADD COLUMN IF NOT EXISTS "descripcion" TEXT;
ALTER TABLE "course_videos" ADD COLUMN IF NOT EXISTS "duracion_segundos" INTEGER;
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "categoria" TEXT;
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "nivel" TEXT;

CREATE TABLE IF NOT EXISTS "lesson_resources" (
    "id" UUID NOT NULL,
    "video_id" UUID NOT NULL,
    "titulo" TEXT NOT NULL,
    "archivo_url" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "lesson_resources_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "lesson_resources_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "course_videos"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "lesson_resources_video_id_orden_idx" ON "lesson_resources"("video_id", "orden");
