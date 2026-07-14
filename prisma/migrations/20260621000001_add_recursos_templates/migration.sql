-- Recursos: plantillas editables (seccion aislada, tabla nueva, no toca nada existente)

-- CreateTable
CREATE TABLE "templates" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "ancho" INTEGER NOT NULL,
    "alto" INTEGER NOT NULL,
    "fondo_url" TEXT NOT NULL,
    "thumb_url" TEXT,
    "zonas" JSONB NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_por" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "templates_activo_categoria_idx" ON "templates"("activo", "categoria");
