-- Fix: strict_json_output should default to TRUE so AI engine returns parseable JSON
ALTER TABLE bot_prompts ALTER COLUMN strict_json_output SET DEFAULT true;

-- Fix: bots should default to is_active=true so new bots work immediately
ALTER TABLE bots ALTER COLUMN is_active SET DEFAULT true;

-- Fix: Update any existing bot_prompts with strict_json_output=false
UPDATE bot_prompts SET strict_json_output = true WHERE strict_json_output = false;
