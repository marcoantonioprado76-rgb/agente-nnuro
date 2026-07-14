-- Áreas de flyers gestionables por el admin (qué pestañas aparecen en "Filtrar flyers")
CREATE TABLE "flyer_areas" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "flyer_areas_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "flyer_areas_nombre_key" ON "flyer_areas"("nombre");
CREATE INDEX "flyer_areas_activo_orden_idx" ON "flyer_areas"("activo", "orden");
