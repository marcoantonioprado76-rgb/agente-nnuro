-- Reto 90D: registro público por reto (link + estado) y datos extra del miembro
ALTER TABLE "reto90d_challenges" ADD COLUMN IF NOT EXISTS "public_slug" TEXT;
ALTER TABLE "reto90d_challenges" ADD COLUMN IF NOT EXISTS "registration_open" BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS "reto90d_challenges_public_slug_key" ON "reto90d_challenges"("public_slug");
ALTER TABLE "reto90d_members" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "reto90d_members" ADD COLUMN IF NOT EXISTS "country" TEXT;
ALTER TABLE "reto90d_members" ADD COLUMN IF NOT EXISTS "city" TEXT;
