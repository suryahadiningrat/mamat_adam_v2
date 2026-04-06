-- Workspace branding columns
-- Run in Supabase SQL Editor

ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS logo_url      TEXT,
  ADD COLUMN IF NOT EXISTS avatar_color  TEXT DEFAULT '#7c6dfa',
  ADD COLUMN IF NOT EXISTS avatar_emoji  TEXT;

-- Existing workspaces get the default purple color
UPDATE workspaces SET avatar_color = '#7c6dfa' WHERE avatar_color IS NULL;
