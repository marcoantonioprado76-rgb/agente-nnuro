-- Remove referral and commission system
ALTER TABLE users DROP COLUMN IF EXISTS referral_code;
ALTER TABLE users DROP COLUMN IF EXISTS sponsor_id;
DROP TABLE IF EXISTS commissions;
DROP TYPE IF EXISTS "CommissionType";
