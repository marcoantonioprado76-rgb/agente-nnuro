-- Pack Empresarial: organizaciones (multi-empresa) — aditivo y seguro.
DO $$ BEGIN CREATE TYPE "OrgRole" AS ENUM ('NONE','ORG_ADMIN','ORG_USER'); EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "organizations" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "max_users" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "billing_note" TEXT,
  "logo_url" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "organizations_slug_key" ON "organizations"("slug");

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "organization_id" UUID;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "org_role" "OrgRole" NOT NULL DEFAULT 'NONE';
DO $$ BEGIN ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
