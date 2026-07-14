-- Acceso manual a Academy/Recursos/Shop otorgado por el admin (aditivo, seguro).
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "access_extras" BOOLEAN NOT NULL DEFAULT false;
