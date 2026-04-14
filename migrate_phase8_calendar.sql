-- Migration: Phase 8 - Content Calendar & Pipeline

-- 1. Create `calendar_items` table
CREATE TABLE calendar_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE SET NULL,
  title varchar(255) NOT NULL,
  date date NOT NULL,
  channel varchar(50),
  format varchar(50),
  status varchar(30) DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'review', 'approved', 'published', 'archived')),
  owner_id uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Add RLS to `calendar_items`
ALTER TABLE calendar_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_member_access" ON calendar_items
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM user_workspace_roles
      WHERE user_id = auth.uid()
    )
  );

-- 3. Add `calendar_item_id` to `generation_requests` and `generation_outputs`
-- This links the generation pipeline to a specific calendar slot
ALTER TABLE generation_requests ADD COLUMN IF NOT EXISTS calendar_item_id uuid REFERENCES calendar_items(id) ON DELETE SET NULL;
ALTER TABLE generation_outputs ADD COLUMN IF NOT EXISTS calendar_item_id uuid REFERENCES calendar_items(id) ON DELETE SET NULL;

-- 4. Add trigger to auto-update `updated_at`
CREATE OR REPLACE FUNCTION update_calendar_item_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calendar_items_updated_at
BEFORE UPDATE ON calendar_items
FOR EACH ROW
EXECUTE PROCEDURE update_calendar_item_updated_at();