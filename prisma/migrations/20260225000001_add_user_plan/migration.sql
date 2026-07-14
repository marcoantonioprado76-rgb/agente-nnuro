-- CreateEnum
CREATE TYPE "UserPlan" AS ENUM ('NONE', 'BASIC', 'PRO', 'ELITE');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "plan" "UserPlan" NOT NULL DEFAULT 'BASIC';
