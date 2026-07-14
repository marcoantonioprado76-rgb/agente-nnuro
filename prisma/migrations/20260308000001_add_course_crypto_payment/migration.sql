-- Add PENDING_VERIFICATION to CourseEnrollmentStatus enum
ALTER TYPE "CourseEnrollmentStatus" ADD VALUE IF NOT EXISTS 'PENDING_VERIFICATION';

-- Add payment fields to course_enrollments
ALTER TABLE course_enrollments
  ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS tx_hash TEXT,
  ADD COLUMN IF NOT EXISTS block_number BIGINT;

-- Unique index to prevent duplicate crypto txHash across enrollments
CREATE UNIQUE INDEX IF NOT EXISTS course_enrollments_tx_hash_key ON course_enrollments(tx_hash) WHERE tx_hash IS NOT NULL;
