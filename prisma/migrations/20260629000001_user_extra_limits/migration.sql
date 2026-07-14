-- Servicios extra otorgados manualmente por el admin (sobre el límite del plan).
-- Aditivo y seguro: columnas nuevas con DEFAULT 0 (no reescribe la tabla en PG11+).
ALTER TABLE "users" ADD COLUMN "extra_stores" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "extra_products" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "extra_landing_pages" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "extra_ads_per_month" INTEGER NOT NULL DEFAULT 0;
