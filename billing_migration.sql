-- 1. Add API tracking columns to workspaces (if not exists)
ALTER TABLE workspaces
ADD COLUMN IF NOT EXISTS api_usage_usd NUMERIC(10, 4) DEFAULT 0.0000,
ADD COLUMN IF NOT EXISTS api_limit_usd NUMERIC(10, 4) DEFAULT 20.0000;

-- 2. Create the RPC function to securely increment usage (bypassing RLS)
CREATE OR REPLACE FUNCTION increment_api_usage(p_workspace_id UUID, p_amount NUMERIC)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the function creator (admin)
AS $$
BEGIN
  UPDATE workspaces
  SET api_usage_usd = api_usage_usd + p_amount
  WHERE id = p_workspace_id;
END;
$$;

-- 3. Auto-generate the 'Floothink Agency' workspace for adam@floothink.com
DO $$
DECLARE
  v_user_id UUID;
  v_workspace_id UUID;
BEGIN
  -- Get the target user ID
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'adam@floothink.com' LIMIT 1;
  
  -- If the user exists, proceed
  IF v_user_id IS NOT NULL THEN
    
    -- Check if 'Floothink Agency' workspace already exists
    SELECT id INTO v_workspace_id FROM workspaces WHERE slug = 'floothink-agency' LIMIT 1;
    
    -- If not, create it
    IF v_workspace_id IS NULL THEN
      INSERT INTO workspaces (name, slug, description, api_limit_usd)
      VALUES ('Floothink Agency', 'floothink-agency', 'Main agency workspace', 20.00)
      RETURNING id INTO v_workspace_id;
    END IF;
    
    -- Ensure user_workspace_roles exists bridging the user and the workspace
    IF NOT EXISTS (SELECT 1 FROM user_workspace_roles WHERE user_id = v_user_id AND workspace_id = v_workspace_id) THEN
      INSERT INTO user_workspace_roles (workspace_id, user_id, role)
      VALUES (v_workspace_id, v_user_id, 'admin');
    END IF;
    
    -- Also ensure there's a user_profile to avoid foreign-key panics in other parts of the app
    IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE id = v_user_id) THEN
      INSERT INTO user_profiles (id, full_name, status)
      VALUES (v_user_id, 'Adam Lahm', 'active');
    END IF;
    
  END IF;
END $$;
