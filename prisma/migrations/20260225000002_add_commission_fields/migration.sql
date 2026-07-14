-- Add fromUserId to commissions
ALTER TABLE "commissions" ADD COLUMN "from_user_id" UUID;

-- Add SPONSORSHIP_BONUS to CommissionType enum
ALTER TYPE "CommissionType" ADD VALUE IF NOT EXISTS 'SPONSORSHIP_BONUS';
