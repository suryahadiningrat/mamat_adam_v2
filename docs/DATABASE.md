# Database Schema

## Overview

All core tables use workspace-scoped Row Level Security (RLS). Users can only access data belonging to workspaces where they have an active role in \`user_workspace_roles\`.

| Table | Purpose |
|-------|---------|
| \`workspaces\` | Core tenant table, stores API limits and billing |
| \`user_profiles\` | Extended user data linked to \`auth.users\` |
| \`user_workspace_roles\` | Junction table for workspace access (admin/editor/viewer) |
| \`workspace_invitations\` | Pending invites by email |
| \`brands\` | Brand entities |
| \`brand_brain_versions\` | Versioned AI context for brands |
| \`products\` | Product entities |
| \`product_brain_versions\` | Versioned AI context for products |
| \`generation_requests\` | Metadata for generation API calls |
| \`generation_outputs\` | Actual generated content |
| \`content_topics\` | Saved bulk topic calendar items |
| \`campaigns\` | Campaign strategy entities |
| \`campaign_outputs\` | Generated campaign strategy briefs |

---

## Key RLS Policy Pattern

All workspace-scoped tables enforce isolation using this pattern:

\`\`\`sql
CREATE POLICY "tenant isolation" ON table_name
FOR ALL USING (
  workspace_id IN (
    SELECT workspace_id FROM user_workspace_roles WHERE user_id = auth.uid()
  )
);
\`\`\`

## Core Schema Details

### Workspaces & Users
- \`workspaces\`: \`id\`, \`name\`, \`slug\`, \`api_usage_usd\`, \`api_limit_usd\`, \`status\`
- \`user_profiles\`: \`id\` (references \`auth.users\`), \`full_name\`, \`email\`, \`is_superadmin\`
- \`user_workspace_roles\`: \`id\`, \`workspace_id\`, \`user_id\`, \`role\`

### Brand & Product Brain
Versioned tables track changes to AI context:
- \`brands\`: \`id\`, \`workspace_id\`, \`name\`, \`current_brain_version_id\`
- \`brand_brain_versions\`: \`id\`, \`brand_id\`, \`tone_of_voice\`, \`brand_personality\`, \`target_audience\`, \`content_pillars\`, etc.
- \`products\`: \`id\`, \`workspace_id\`, \`brand_id\`, \`name\`, \`current_brain_version_id\`
- \`product_brain_versions\`: \`id\`, \`product_id\`, \`usp\`, \`functional_benefits\`, \`emotional_benefits\`, etc.

### Generation Pipeline
- \`generation_requests\`: Stores inputs (platform, objective, format, framework, language, workspace_id)
- \`generation_outputs\`: Stores outputs (\`content_title\`, \`copy_on_visual\`, \`caption\`, \`slides\`, \`scenes\`, \`hashtag_pack\`, \`status\`)

---

## Supabase Storage

| Bucket | Access | Purpose |
|--------|--------|---------|
| \`product_images\` | Public read, Auth write | Product thumbnails and workspace logos |

## Custom RPC Functions

- \`increment_api_usage(p_workspace_id uuid, p_amount numeric)\`: Safely increments the workspace API usage cost after each successful Claude API call.
