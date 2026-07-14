-- Add free_for_plan column to courses
ALTER TABLE "courses" ADD COLUMN "free_for_plan" BOOLEAN NOT NULL DEFAULT false;
