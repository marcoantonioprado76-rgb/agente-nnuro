-- Add EXTRA_BONUS value to CommissionType enum
ALTER TYPE "CommissionType" ADD VALUE IF NOT EXISTS 'EXTRA_BONUS';
