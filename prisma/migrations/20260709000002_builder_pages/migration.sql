-- Reemplaza el servicio de landing viejo (LandingPage/Lead) por el builder GrapesJS (BuilderPage/BuilderLead).
-- DESTRUCTIVO: elimina las landing pages viejas y sus leads.
DROP TABLE IF EXISTS "leads";
DROP TABLE IF EXISTS "landing_pages";

CREATE TABLE "builder_pages" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Mi página',
    "slug" TEXT NOT NULL,
    "html" TEXT NOT NULL DEFAULT '',
    "css" TEXT NOT NULL DEFAULT '',
    "project_data" JSONB,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "share_token" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "builder_pages_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "builder_pages_slug_key" ON "builder_pages"("slug");
CREATE UNIQUE INDEX "builder_pages_share_token_key" ON "builder_pages"("share_token");
CREATE INDEX "builder_pages_user_id_idx" ON "builder_pages"("user_id");
ALTER TABLE "builder_pages" ADD CONSTRAINT "builder_pages_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "builder_leads" (
    "id" UUID NOT NULL,
    "builder_page_id" UUID NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "builder_leads_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "builder_leads_builder_page_id_idx" ON "builder_leads"("builder_page_id");
ALTER TABLE "builder_leads" ADD CONSTRAINT "builder_leads_builder_page_id_fkey"
    FOREIGN KEY ("builder_page_id") REFERENCES "builder_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
