-- Pack Empresarial: solicitudes de pago scoped a la empresa.
ALTER TABLE "pack_purchase_requests" ADD COLUMN IF NOT EXISTS "organization_id" UUID;
CREATE INDEX IF NOT EXISTS "pack_purchase_requests_organization_id_status_idx" ON "pack_purchase_requests"("organization_id","status");
