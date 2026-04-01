-- Fix: Add missing Row-Level Security policy for the workspaces table
-- This allows users to actually SEE their workspace data and billing usage

CREATE POLICY "workspace_member_access_on_workspaces" 
ON workspaces
FOR SELECT 
USING (
  id IN (
    SELECT workspace_id FROM user_workspace_roles
    WHERE user_id = auth.uid()
  )
);
