-- Pack Empresarial Fase 3: aislamiento de contenido por empresa (aditivo, seguro).
ALTER TABLE "courses"     ADD COLUMN IF NOT EXISTS "organization_id" UUID;
ALTER TABLE "store_items" ADD COLUMN IF NOT EXISTS "organization_id" UUID;
ALTER TABLE "podcasts"    ADD COLUMN IF NOT EXISTS "organization_id" UUID;
ALTER TABLE "templates"   ADD COLUMN IF NOT EXISTS "organization_id" UUID;
ALTER TABLE "resources"   ADD COLUMN IF NOT EXISTS "organization_id" UUID;
CREATE INDEX IF NOT EXISTS "courses_organization_id_idx"     ON "courses"("organization_id");
CREATE INDEX IF NOT EXISTS "store_items_organization_id_idx" ON "store_items"("organization_id");
CREATE INDEX IF NOT EXISTS "podcasts_organization_id_idx"    ON "podcasts"("organization_id");
CREATE INDEX IF NOT EXISTS "templates_organization_id_idx"   ON "templates"("organization_id");
CREATE INDEX IF NOT EXISTS "resources_organization_id_idx"   ON "resources"("organization_id");
