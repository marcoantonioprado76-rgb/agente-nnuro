-- Make account_id nullable in clipping_submissions (YouTube doesn't need OAuth)
ALTER TABLE "clipping_submissions" ALTER COLUMN "account_id" DROP NOT NULL;
