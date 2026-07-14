-- CreateEnum
CREATE TYPE "CourseEnrollmentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable courses
CREATE TABLE "courses" (
  "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
  "title"       TEXT        NOT NULL,
  "description" TEXT        NOT NULL,
  "cover_url"   TEXT,
  "price"       NUMERIC(10,2) NOT NULL,
  "active"      BOOLEAN     NOT NULL DEFAULT true,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable course_videos
CREATE TABLE "course_videos" (
  "id"          UUID    NOT NULL DEFAULT gen_random_uuid(),
  "course_id"   UUID    NOT NULL,
  "title"       TEXT    NOT NULL,
  "youtube_url" TEXT    NOT NULL,
  "order"       INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "course_videos_pkey" PRIMARY KEY ("id")
);

-- CreateTable course_enrollments
CREATE TABLE "course_enrollments" (
  "id"         UUID                      NOT NULL DEFAULT gen_random_uuid(),
  "user_id"    UUID                      NOT NULL,
  "course_id"  UUID                      NOT NULL,
  "status"     "CourseEnrollmentStatus"  NOT NULL DEFAULT 'PENDING',
  "proof_url"  TEXT,
  "notes"      TEXT,
  "created_at" TIMESTAMPTZ               NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ               NOT NULL DEFAULT now(),
  CONSTRAINT "course_enrollments_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey course_videos → courses
ALTER TABLE "course_videos" ADD CONSTRAINT "course_videos_course_id_fkey"
  FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey course_enrollments → users
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey course_enrollments → courses
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_course_id_fkey"
  FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "course_videos_course_id_order_idx" ON "course_videos"("course_id", "order");
CREATE UNIQUE INDEX "course_enrollments_user_id_course_id_key" ON "course_enrollments"("user_id", "course_id");
CREATE INDEX "course_enrollments_status_idx" ON "course_enrollments"("status");
