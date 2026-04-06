-- ============================================================
-- Migration: content_topics table
-- Run in Supabase SQL Editor
-- ============================================================

create table if not exists content_topics (
  id              uuid primary key default uuid_generate_v4(),
  workspace_id    uuid references workspaces(id) on delete cascade,
  brand_id        uuid references brands(id) on delete set null,
  product_id      uuid references products(id) on delete set null,
  content_title   varchar(512) not null,
  content_pillar  varchar(255),
  content_format  varchar(100),
  platform        varchar(50),
  objective       varchar(100),
  publish_date    date,
  status          varchar(30) default 'draft' check (status in ('draft','approved','generated')),
  created_by      uuid references auth.users(id),
  created_at      timestamptz default now()
);

-- If upgrading an existing content_topics table, run:
-- alter table content_topics add column if not exists objective varchar(100);

-- RLS
alter table content_topics enable row level security;

create policy "workspace_member_access_on_content_topics"
  on content_topics for all
  using (
    workspace_id in (
      select workspace_id from user_workspace_roles where user_id = auth.uid()
    )
  );
