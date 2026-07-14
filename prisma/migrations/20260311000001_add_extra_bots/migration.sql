-- Add extra_bots column to users table
-- Allows admins to grant additional bot slots beyond the plan limit
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "extra_bots" INTEGER NOT NULL DEFAULT 0;
