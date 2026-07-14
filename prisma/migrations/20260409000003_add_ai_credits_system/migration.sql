-- Add AI credits and key preference to users
ALTER TABLE "users" ADD COLUMN "ai_credits" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "prefer_own_key" BOOLEAN NOT NULL DEFAULT false;

-- Create admin config table (singleton row with id='global')
CREATE TABLE "admin_configs" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "openai_key_enc" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "admin_configs_pkey" PRIMARY KEY ("id")
);

-- Seed the singleton row
INSERT INTO "admin_configs" ("id", "updated_at") VALUES ('global', NOW())
ON CONFLICT ("id") DO NOTHING;
