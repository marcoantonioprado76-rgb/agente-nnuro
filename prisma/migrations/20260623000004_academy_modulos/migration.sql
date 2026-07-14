-- Academy Fase 3.1: sección/módulo por lección (agrupa la lista de contenido)
ALTER TABLE "course_videos" ADD COLUMN IF NOT EXISTS "modulo_titulo" TEXT;
