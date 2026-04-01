-- ============================================================
-- MIGRATION 007: GPT model selector + per-message char limits
-- ============================================================

-- 1. bots: add gpt_model column (default gpt-5.1)
DO $$ BEGIN
  ALTER TABLE bots ADD COLUMN gpt_model text NOT NULL DEFAULT 'gpt-5.1';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 2. bot_prompts: add per-message character limits
DO $$ BEGIN
  ALTER TABLE bot_prompts ADD COLUMN max_chars_message1 integer NOT NULL DEFAULT 500;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE bot_prompts ADD COLUMN max_chars_message2 integer NOT NULL DEFAULT 300;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE bot_prompts ADD COLUMN max_chars_message3 integer NOT NULL DEFAULT 200;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Migrate existing max_chars_per_message value to message1 for existing rows
UPDATE bot_prompts
  SET max_chars_message1 = COALESCE(max_chars_per_message, 500)
  WHERE max_chars_message1 = 500
    AND max_chars_per_message IS NOT NULL
    AND max_chars_per_message != 500;
