-- ============================================================
-- FCE MVP Database Schema — Run in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── Workspaces ────────────────────────────────────────────
create table workspaces (
  id uuid primary key default uuid_generate_v4(),
  name varchar(255) not null,
  slug varchar(100) unique not null,
  description text,
  status varchar(20) default 'active' check (status in ('active','archived')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Users (extends Supabase auth.users) ───────────────────
create table user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name varchar(255),
  avatar_url text,
  status varchar(20) default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── User Workspace Roles ──────────────────────────────────
create table user_workspace_roles (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role varchar(20) default 'editor' check (role in ('admin','editor','viewer')),
  created_at timestamptz default now(),
  unique(workspace_id, user_id)
);

-- ── Brands ────────────────────────────────────────────────
create table brands (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id) on delete cascade,
  name varchar(255) not null,
  slug varchar(100) not null,
  category varchar(100),
  summary text,
  status varchar(20) default 'draft' check (status in ('draft','active','archived')),
  current_brain_version_id uuid,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(workspace_id, slug)
);

-- ── Brand Brain Versions ──────────────────────────────────
create table brand_brain_versions (
  id uuid primary key default uuid_generate_v4(),
  brand_id uuid references brands(id) on delete cascade,
  workspace_id uuid references workspaces(id),
  version_no integer not null default 1,
  brand_personality text,
  tone_of_voice text,
  audience_persona jsonb,
  brand_values jsonb,
  brand_promise text,
  messaging_rules jsonb,
  vocabulary_whitelist jsonb,
  vocabulary_blacklist jsonb,
  visual_direction_notes text,
  cultural_relevance_notes text,
  source_summary text,
  status varchar(20) default 'draft' check (status in ('draft','approved','archived')),
  created_by uuid references auth.users(id),
  approved_by uuid references auth.users(id),
  created_at timestamptz default now(),
  approved_at timestamptz
);

-- ── Products ──────────────────────────────────────────────
create table products (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id) on delete cascade,
  brand_id uuid references brands(id) on delete cascade,
  name varchar(255) not null,
  slug varchar(100) not null,
  image_url text,
  product_type varchar(100),
  summary text,
  status varchar(20) default 'draft' check (status in ('draft','active','archived')),
  current_brain_version_id uuid,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Product Brain Versions ────────────────────────────────
create table product_brain_versions (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid references products(id) on delete cascade,
  brand_id uuid references brands(id),
  workspace_id uuid references workspaces(id),
  version_no integer not null default 1,
  usp text,
  rtb text,
  functional_benefits jsonb,
  emotional_benefits jsonb,
  target_audience text,
  price_tier varchar(50),
  key_claims jsonb,
  mandatory_disclaimers text,
  platform_relevance jsonb,
  content_angles jsonb,
  objection_handling jsonb,
  status varchar(20) default 'draft' check (status in ('draft','approved','archived')),
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- ── Frameworks / Taxonomy ─────────────────────────────────
create table frameworks (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id),
  name varchar(100) not null,
  description text,
  is_global boolean default false
);

insert into frameworks (name, description, is_global) values
  ('AIDA', 'Attention → Interest → Desire → Action', true),
  ('PAS', 'Problem → Agitation → Solution', true),
  ('BAB', 'Before → After → Bridge', true);

create table hook_types (
  id uuid primary key default uuid_generate_v4(),
  name varchar(100) not null,
  description text,
  is_global boolean default false
);

insert into hook_types (name, description, is_global) values
  ('Curiosity', 'Open a loop the reader wants to close', true),
  ('Pain Point', 'Identify and amplify a known struggle', true),
  ('Bold Claim', 'Start with a surprising or provocative statement', true),
  ('Social Proof', 'Lead with results or testimonials', true),
  ('Story', 'Start in the middle of a narrative', true);

-- ── Generation Requests ───────────────────────────────────
create table generation_requests (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id),
  brand_id uuid references brands(id),
  product_id uuid references products(id),
  platform varchar(50),
  output_format varchar(100),
  objective varchar(100),
  framework_id uuid references frameworks(id),
  hook_type_id uuid references hook_types(id),
  tone_override text,
  visual_style varchar(100),
  output_length varchar(50),
  additional_context text,
  language varchar(10) default 'id',
  status varchar(30) default 'pending' check (status in ('pending','processing','completed','failed')),
  source_context_summary text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- ── Generation Outputs ────────────────────────────────────
create table generation_outputs (
  id uuid primary key default uuid_generate_v4(),
  request_id uuid references generation_requests(id) on delete cascade,
  workspace_id uuid references workspaces(id),
  copy_on_visual text,
  caption text,
  slides jsonb,
  scenes jsonb,
  cta_options jsonb,
  hashtag_pack jsonb,
  visual_direction text,
  rationale text,
  raw_response jsonb,
  status varchar(30) default 'draft' check (status in ('draft','approved','rejected')),
  edited_copy_on_visual text,
  edited_caption text,
  edited_slides jsonb,
  edited_scenes jsonb,
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Output Feedback Events ────────────────────────────────
create table output_feedback_events (
  id uuid primary key default uuid_generate_v4(),
  output_id uuid references generation_outputs(id) on delete cascade,
  workspace_id uuid references workspaces(id),
  event_type varchar(50) check (event_type in ('hook_edit','copy_edit','cta_edit','approved','rejected','regenerate_hook','regenerate_copy','saved','exported')),
  section varchar(50),
  before_value text,
  after_value text,
  user_id uuid references auth.users(id),
  created_at timestamptz default now()
);

-- ── Campaigns ─────────────────────────────────────────────
create table campaigns (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id),
  brand_id uuid references brands(id),
  product_id uuid references products(id),
  name varchar(255) not null,
  objective varchar(100),
  audience_segment text,
  flight_start date,
  flight_end date,
  budget_range varchar(100),
  key_message text,
  channel_mix jsonb,
  cultural_context text,
  status varchar(30) default 'draft' check (status in ('draft','active','approved','archived')),
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Campaign Outputs ──────────────────────────────────────
create table campaign_outputs (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid references campaigns(id) on delete cascade,
  version_no integer default 1,
  big_idea text,
  campaign_theme text,
  message_pillars jsonb,
  audience_insight text,
  funnel_journey jsonb,
  channel_role_mapping jsonb,
  content_pillar_plan jsonb,
  deliverables_recommendation jsonb,
  kpi_recommendation jsonb,
  budget_allocation_draft jsonb,
  rationale text,
  status varchar(30) default 'draft' check (status in ('draft','approved','archived')),
  created_at timestamptz default now()
);

-- ── Recommendation Profiles ───────────────────────────────
create table recommendation_profiles (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id),
  brand_id uuid references brands(id),
  best_frameworks jsonb,
  best_hooks jsonb,
  preferred_tones jsonb,
  common_edit_patterns jsonb,
  updated_at timestamptz default now()
);

-- ── Audit Logs ────────────────────────────────────────────
create table audit_logs (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id),
  user_id uuid references auth.users(id),
  action varchar(100) not null,
  entity_type varchar(50),
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz default now()
);

-- ── RLS (Row Level Security) ──────────────────────────────
alter table workspaces enable row level security;
alter table brands enable row level security;
alter table products enable row level security;
alter table generation_requests enable row level security;
alter table generation_outputs enable row level security;
alter table campaigns enable row level security;

-- Basic RLS: users can only access their workspace data
create policy "workspace_member_access" on brands
  for all using (
    workspace_id in (
      select workspace_id from user_workspace_roles
      where user_id = auth.uid()
    )
  );

create policy "workspace_member_access" on products
  for all using (
    workspace_id in (
      select workspace_id from user_workspace_roles
      where user_id = auth.uid()
    )
  );

create policy "workspace_member_access" on generation_requests
  for all using (
    workspace_id in (
      select workspace_id from user_workspace_roles
      where user_id = auth.uid()
    )
  );

create policy "workspace_member_access" on generation_outputs
  for all using (
    workspace_id in (
      select workspace_id from user_workspace_roles
      where user_id = auth.uid()
    )
  );

-- ── Indexes ───────────────────────────────────────────────
create index idx_brands_workspace on brands(workspace_id);
create index idx_products_brand on products(brand_id);
create index idx_gen_requests_workspace on generation_requests(workspace_id);
create index idx_gen_outputs_request on generation_outputs(request_id);
create index idx_feedback_output on output_feedback_events(output_id);
create index idx_campaigns_workspace on campaigns(workspace_id);
