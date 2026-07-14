-- Remove binary MLM structure (replaced by unilevel via sponsorId)

-- 1. Drop binary_positions table
DROP TABLE IF EXISTS "binary_positions";

-- 2. Drop Position enum (LEFT/RIGHT)
DROP TYPE IF EXISTS "Position";

-- 3. Replace CommissionType enum (remove BINARY_BONUS)
--    Safe to do since no data uses BINARY_BONUS
ALTER TYPE "CommissionType" RENAME TO "CommissionType_old";
CREATE TYPE "CommissionType" AS ENUM ('DIRECT_BONUS', 'SPONSORSHIP_BONUS');
ALTER TABLE "commissions"
  ALTER COLUMN "type" TYPE "CommissionType"
  USING "type"::text::"CommissionType";
DROP TYPE "CommissionType_old";
