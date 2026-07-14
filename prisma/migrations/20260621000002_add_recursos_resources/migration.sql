-- Recursos: presentaciones y libros (PDF). Tabla nueva, aislada, no toca nada existente.

-- CreateTable
CREATE TABLE "resources" (
    "id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "archivo_url" TEXT NOT NULL,
    "portada_url" TEXT,
    "paginas" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_por" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "resources_tipo_activo_categoria_idx" ON "resources"("tipo", "activo", "categoria");
