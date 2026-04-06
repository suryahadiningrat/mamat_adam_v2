-- ============================================================
-- Migration: Team / Workspace Member Management
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Add email + superadmin flag to user_profiles
alter table user_profiles add column if not exists email varchar(255);
alter table user_profiles add column if not exists is_superadmin boolean not null default false;

-- 2. Workspace invitations table
create table if not exists workspace_invitations (
  id              uuid primary key default uuid_generate_v4(),
  workspace_id    uuid references workspaces(id) on delete cascade not null,
  invited_email   varchar(255) not null,
  invited_by      uuid references auth.users(id),
  role            varchar(20) not null default 'editor' check (role in ('admin','editor','viewer')),
  status          varchar(20) not null default 'pending' check (status in ('pending','accepted','revoked')),
  created_at      timestamptz default now(),
  accepted_at     timestamptz,
  unique(workspace_id, invited_email)
);

alter table workspace_invitations enable row level security;

-- Workspace members can manage invitations for their workspace
create policy "workspace_member_manage_invitations"
  on workspace_invitations for all
  using (
    workspace_id in (
      select workspace_id from user_workspace_roles where user_id = auth.uid()
    )
  );

-- Invited user can see their own pending invite (needed during signup)
create policy "invitee_can_see_own_invite"
  on workspace_invitations for select
  using (
    lower(invited_email) = lower((select email from auth.users where id = auth.uid()))
  );

-- 3. Superadmin bypass RLS policies
--    These allow a superadmin to read/write across all workspaces.

create policy "superadmin_all_workspaces"
  on workspaces for all
  using (
    exists (select 1 from user_profiles where id = auth.uid() and is_superadmin = true)
  );

create policy "superadmin_all_workspace_roles"
  on user_workspace_roles for all
  using (
    exists (select 1 from user_profiles where id = auth.uid() and is_superadmin = true)
  );

create policy "superadmin_all_invitations"
  on workspace_invitations for all
  using (
    exists (select 1 from user_profiles where id = auth.uid() and is_superadmin = true)
  );

-- Allow superadmin to read all user profiles (for member management)
-- user_profiles normally only allows reading own row
create policy "superadmin_read_all_profiles"
  on user_profiles for all
  using (
    id = auth.uid()
    or exists (select 1 from user_profiles up where up.id = auth.uid() and up.is_superadmin = true)
  );

-- 4. Make yourself a superadmin (replace with your actual user ID from Supabase Auth → Users)
-- UPDATE user_profiles SET is_superadmin = true WHERE id = 'YOUR-USER-UUID-HERE';
