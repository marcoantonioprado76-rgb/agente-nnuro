-- Add likes and comments columns to clipping_submissions
ALTER TABLE clipping_submissions ADD COLUMN IF NOT EXISTS likes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE clipping_submissions ADD COLUMN IF NOT EXISTS comments INTEGER NOT NULL DEFAULT 0;
