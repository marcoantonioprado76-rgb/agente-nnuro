CREATE TABLE IF NOT EXISTS "podcasts" (
  "id"          UUID NOT NULL DEFAULT gen_random_uuid(),
  "title"       TEXT NOT NULL,
  "description" TEXT,
  "cover_url"   TEXT,
  "embed_url"   TEXT NOT NULL,
  "active"      BOOLEAN NOT NULL DEFAULT true,
  "order"       INTEGER NOT NULL DEFAULT 0,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "podcasts_pkey" PRIMARY KEY ("id")
);
