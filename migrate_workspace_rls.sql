-- Allow workspace admins to update their own workspace
CREATE POLICY "workspace_admins_can_update"
ON workspaces FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_workspace_roles
    WHERE workspace_id = workspaces.id
      AND user_id = auth.uid()
      AND role = 'admin'
  )
);

-- Allow workspace admins to insert new workspaces (needed for create workspace)
-- (already handled by authenticated insert, but explicit is safer)
CREATE POLICY "authenticated_users_can_create_workspaces"
ON workspaces FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);
