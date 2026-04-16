# FCE Dashboard — Developer Documentation

> **FCE (Floothink Content Engine)** — AI-powered social media content generation platform for brand marketing.  
> Last updated: 2026-04-14

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Environment Variables](#3-environment-variables)
4. [Architecture Overview](#4-architecture-overview)
5. [Database Schema](#5-database-schema)
6. [Pages & Routes](#6-pages--routes)
7. [API Routes](#7-api-routes)
8. [Workspace Context](#8-workspace-context)
9. [Marketing Skills](#9-marketing-skills)
10. [AI Models & Cost Tracking](#10-ai-models--cost-tracking)
11. [Feature Map](#11-feature-map)

---

## 1. Project Overview

FCE is a multi-tenant SaaS dashboard where marketing teams can:
- Define brand identity ("Brand Brain") and product context ("Product Brain")
- Auto-scrape brand/product information from websites and social media using AI
- Generate AI-written social media content (single posts, carousels, reels, stories)
- Build content calendars (bulk topic generation)
- Plan full campaign strategies with Big Idea, channel mix, KPIs
- Manage and approve generated content in a shared library
- Invite team members with role-based access (admin / editor / viewer)

Data is workspace-scoped. Every brand, product, generation, and campaign belongs to one workspace. RLS policies at the Supabase level enforce this isolation.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | CSS custom properties (design tokens), global `globals.css` |
| Icons | Lucide React |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email/password) |
| AI | Anthropic Claude API |
| Storage | Supabase Storage (`product_images` bucket) |
| Hosting | Vercel |

---

## 3. Environment Variables

| Variable | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | Supabase anon key (RLS enforced) |
| `ANTHROPIC_API_KEY` | Server only | Claude API key — never exposed to client |

---

## 4. Architecture Overview

```
src/
├── app/
│   ├── (dashboard)/          # All authenticated pages
│   │   ├── layout.tsx        # Auth guard, workspace init, sidebar
│   │   ├── page.tsx          # Home / Dashboard
│   │   ├── generate/         # Content generation
│   │   ├── topics/           # Bulk topic generator
│   │   ├── topic-library/    # Saved topics manager
│   │   ├── campaigns/        # Campaign strategy builder
│   │   ├── brands/           # Brand Brain manager
│   │   ├── products/         # Product Brain manager
│   │   ├── library/          # Generated content library
│   │   ├── learning/         # Analytics & insights
│   │   ├── settings/         # User + workspace settings
│   │   ├── workspace-settings/ # Workspace branding + team
│   │   └── admin/            # Superadmin panel
│   ├── api/
│   │   ├── generate/         # POST — single content generation
│   │   ├── generate-topics/  # POST — bulk topic generation
│   │   ├── generate-campaign/# POST — campaign strategy
│   │   ├── generate-sketch/  # POST — AI image generation (Base64 Data URI output)
│   │   ├── scrape-brand/     # POST — brand info from URLs
│   │   ├── scrape-product/   # POST — product info from URLs
│   │   └── scrape-url/       # POST — fetch any URL → structured summary for reference context
│   ├── login/                # Auth page
│   └── layout.tsx            # Root layout (theme, metadata)
├── contexts/
│   └── WorkspaceContext.tsx  # Active workspace state
└── lib/
    ├── supabase.ts           # Supabase client
    └── skills/
        └── index.ts          # Marketing skills for AI prompts
```

**Request flow for content generation:**
```
User fills form (generate/page.tsx)
  → POST /api/generate
    → Fetch brand + product brain from Supabase
    → Build prompt with marketing skills
    → Call Claude Sonnet 4 (with prompt caching)
    → Parse JSON output
    → Insert into generation_requests + generation_outputs
    → Increment workspace api_usage_usd via RPC
  → Return content to UI
```

**Request flow for AI scraping:**
```
User pastes URLs (brands/page.tsx or products/page.tsx)
  → POST /api/scrape-brand (or /api/scrape-product)
    → Normalize URLs, fetch via Jina Reader (r.jina.ai)
    → Combine markdown content (max 25KB)
    → Call Claude Haiku 4.5 for structured extraction
    → Parse JSON output
  → Auto-fill form fields in UI
```

---

## 5. Database Schema

### Core Tables

#### `workspaces`
```sql
id uuid PK
name varchar(255)
slug varchar(100) UNIQUE
description text
logo_url text              -- workspace avatar image
avatar_color varchar(20)   -- fallback avatar color
avatar_emoji varchar(10)   -- fallback avatar emoji
api_usage_usd numeric      -- current month AI cost
api_limit_usd numeric      -- spending cap (default: 20)
status varchar(20)         -- 'active' | 'archived'
created_at, updated_at timestamptz
```

#### `user_profiles`
```sql
id uuid PK → auth.users(id)
full_name varchar(255)
email varchar(255)
avatar_url text
is_superadmin boolean       -- grants /admin access
status varchar(20)
created_at, updated_at timestamptz
```

#### `user_workspace_roles`
```sql
id uuid PK
workspace_id uuid → workspaces(id)
user_id uuid → auth.users(id)
role varchar(20)            -- 'admin' | 'editor' | 'viewer'
created_at timestamptz
UNIQUE(workspace_id, user_id)
```

#### `workspace_invitations`
```sql
id uuid PK
workspace_id uuid → workspaces(id)
invited_email varchar(255)
role varchar(20)
status varchar(20)          -- 'pending' | 'accepted' | 'revoked'
created_at, accepted_at timestamptz
```

#### `brands`
```sql
id uuid PK
workspace_id uuid → workspaces(id)
name varchar(255)
slug varchar(100)
category varchar(100)       -- industry/sector label
summary text
website text                -- primary website URL(s)
industry varchar(100)
status varchar(20)          -- 'draft' | 'active' | 'archived'
current_brain_version_id uuid
created_by uuid → auth.users(id)
created_at, updated_at timestamptz
```

#### `brand_brain_versions`
The AI-extracted strategic intelligence for a brand. A new version is created each time the brand brain is updated (versioned).
```sql
id uuid PK
brand_id uuid → brands(id)
workspace_id uuid
version_no integer
brand_personality text      -- e.g. "The Trusted Expert"
tone_of_voice text          -- e.g. "Professional, Conversational"
audience_persona jsonb      -- target audience description
brand_values jsonb          -- array of values
brand_promise text
messaging_rules jsonb
vocabulary_whitelist jsonb  -- words to always use
vocabulary_blacklist jsonb  -- words to never use
visual_direction_notes text
cultural_relevance_notes text
source_summary text         -- full scraped + extracted text
-- Extra columns added via migrations:
name varchar(255)
industry text
summary text
unique_selling_points text
content_pillars jsonb
social_media_platforms jsonb
content_language varchar(50)
marketing_strategy text
dos jsonb
donts jsonb
status varchar(20)          -- 'draft' | 'approved' | 'archived'
created_at timestamptz
```

#### `products`
```sql
id uuid PK
workspace_id uuid → workspaces(id)
brand_id uuid → brands(id)
name varchar(255)
slug varchar(100)
image_url text
product_type varchar(100)   -- e.g. "SaaS", "Physical Product", "Service"
summary text
status varchar(20)          -- 'draft' | 'active' | 'archived'
current_brain_version_id uuid
created_at, updated_at timestamptz
```

#### `product_brain_versions`
```sql
id uuid PK
product_id uuid → products(id)
brand_id uuid → brands(id)
workspace_id uuid
version_no integer
usp text                    -- Unique Selling Proposition
rtb text                    -- Reason to Believe (proof points)
functional_benefits jsonb   -- array of tangible benefits
emotional_benefits jsonb    -- array of emotional payoffs
target_audience text
price_tier varchar(50)      -- e.g. "Premium", "Mid-range", "Budget"
key_claims jsonb
mandatory_disclaimers text
platform_relevance jsonb
content_angles jsonb
objection_handling jsonb
status varchar(20)
created_at timestamptz
```

#### `generation_requests`
Metadata for every AI content generation call.
```sql
id uuid PK
workspace_id uuid
brand_id uuid → brands(id)
product_id uuid → products(id)
platform varchar(50)        -- 'Instagram' | 'TikTok' | 'LinkedIn' | etc.
output_format varchar(100)  -- 'Single Image' | 'Carousel' | 'Reel' | etc.
objective varchar(100)      -- 'Awareness' | 'Engagement' | 'Conversion' | etc.
framework_id uuid → frameworks(id)
hook_type_id uuid → hook_types(id)
tone_override text
visual_style varchar(100)
output_length varchar(50)
additional_context text
language varchar(10)        -- default 'id' (Indonesian)
status varchar(30)          -- 'pending' | 'processing' | 'completed' | 'failed'
source_context_summary text
created_by uuid
created_at timestamptz
```

#### `generation_outputs`
The actual AI-generated content. Each request produces one output.
```sql
id uuid PK
request_id uuid → generation_requests(id)
workspace_id uuid
content_title varchar(255)
copy_on_visual text         -- headline text on the image
caption text                -- social media caption
slides jsonb                -- [{slide_number, copy_on_visual, visual_direction}] for carousels
scenes jsonb                -- [{scene_number, script, visual_direction}] for videos
cta_options jsonb           -- array of call-to-action variants
hashtag_pack jsonb          -- array of hashtags
visual_direction text       -- art direction notes
rationale text              -- AI explanation of creative decisions
raw_response jsonb          -- full unparsed Claude response + sketchUrl if image was generated
                            -- shape: { ...claudeOutput, sketchUrl?: string (Base64 data URI) }
status varchar(30)          -- 'draft' | 'approved' | 'rejected'
edited_copy_on_visual text  -- user-edited version
edited_caption text
edited_slides jsonb
edited_scenes jsonb
approved_by uuid
approved_at timestamptz
created_at, updated_at timestamptz
```

#### `content_topics`
Saved topic calendar items generated in bulk.
```sql
id uuid PK
workspace_id uuid
brand_id uuid → brands(id)
product_id uuid → products(id)
content_title varchar(255)
content_pillar varchar(100) -- e.g. "Education", "Promotion", "Storytelling"
content_format varchar(100) -- e.g. "Carousel", "Reel", "Single Image"
platform varchar(50)
objective varchar(100)
publish_date date
status varchar(20)          -- 'idea' | 'approved' | 'generated' | 'archived'
created_at timestamptz
```

#### `campaigns`
```sql
id uuid PK
workspace_id uuid
brand_id uuid
product_id uuid
name varchar(255)
objective varchar(100)
audience_segment text
flight_start date
flight_end date
budget_range varchar(100)
key_message text
channel_mix jsonb           -- array of selected channels
cultural_context text
status varchar(30)          -- 'draft' | 'active' | 'approved' | 'archived'
created_at, updated_at timestamptz
```

#### `campaign_outputs`
```sql
id uuid PK
campaign_id uuid → campaigns(id)
version_no integer
big_idea text
campaign_theme text
message_pillars jsonb       -- array of 3 message pillars
audience_insight text
funnel_journey jsonb        -- {awareness, consideration, conversion}
channel_role_mapping jsonb  -- {channel: role_description}
content_pillar_plan jsonb
deliverables_recommendation jsonb
kpi_recommendation jsonb
budget_allocation_draft jsonb
rationale text
status varchar(30)
created_at timestamptz
```

#### Supporting Taxonomy Tables
```sql
-- frameworks (global + workspace-specific)
frameworks: id, workspace_id, name, description, is_global
-- Seeded: AIDA, PAS, BAB

-- hook_types (global)
hook_types: id, name, description, is_global
-- Seeded: Curiosity, Pain Point, Bold Claim, Social Proof, Story

-- output_feedback_events (user edit tracking)
output_feedback_events: id, output_id, workspace_id, event_type, section, before_value, after_value, user_id, created_at

-- recommendation_profiles (AI personalization data)
recommendation_profiles: id, workspace_id, brand_id, best_frameworks, best_hooks, preferred_tones, common_edit_patterns

-- audit_logs
audit_logs: id, workspace_id, user_id, action, entity_type, entity_id, metadata, created_at
```

### Custom RPC Functions
```sql
-- Increment workspace API usage cost
increment_api_usage(p_workspace_id uuid, p_amount numeric)
```

### RLS Policies
All core tables use workspace-scoped RLS:
```sql
-- Users can only access data in workspaces they belong to
WHERE workspace_id IN (
  SELECT workspace_id FROM user_workspace_roles WHERE user_id = auth.uid()
)
```

---

## 6. Pages & Routes

### Layout: `(dashboard)/layout.tsx`
Wraps all dashboard pages. Responsibilities:
- Check Supabase auth session → redirect to `/login` if unauthenticated
- Create `user_profiles` record on first login
- Create a default workspace for new users
- Accept workspace invitations (matched by email on login)
- Render sidebar navigation + topbar + main content area
- Wrap everything in `WorkspaceProvider`

---

### Home — `/`
**File:** `(dashboard)/page.tsx`

KPI dashboard with workspace overview.

**Displays:**
- Greeting with user's name
- KPI cards: total brands, total products, total generations, total campaigns
- Recent 6 generated content pieces
- Library status counts (approved / draft / rejected)
- Brand overview with product counts
- AI recommendations (best frameworks, hooks, tones based on past edits)
- Workspace health metrics

**DB reads:** `user_profiles`, `brands`, `products`, `generation_outputs`, `generation_requests`, `campaigns`

---

### Generate Content — `/generate`
**File:** `(dashboard)/generate/page.tsx`

The primary content creation workflow.

**Features:**
- Select platform: Instagram, TikTok, YouTube, Twitter/X, LinkedIn, Facebook
- Select output format: Single Image, Carousel (3/5/7/10 slides), Reel, Story, Thread
- Select brand and product
- **Reference & Context panel** (always visible, before target/format selection):
  - Paste any URL → "Analyze" → `/api/scrape-url` extracts structured summary
  - Scraped `contextString` injected into generation prompt as REFERENCE MATERIAL
  - Additional context / creative brief textarea
- Advanced options:
  - Objective (Awareness / Engagement / Conversion / Retention / Education)
  - Framework: AIDA, PAS, BAB, or none
  - Hook type: Curiosity, Pain Point, Bold Claim, Social Proof, Story
  - Tone override
  - Visual style
  - Output length (Short / Medium / Long)
- Language toggle (defaults to Indonesian)
- Generate button → calls `/api/generate`
- **All output fields are editable** before saving (copy on visual, caption, CTAs, hashtags, visual direction, rationale)
- **Regenerate with context**: opens a revision textarea — user describes what to change, then regenerates
- **Draw Image** (per slide/scene/single): generates an AI reference image via `/api/generate-sketch`
  - Uses `buildSketchPrompt()` to prepend full brand/product/content context to every request
  - Once generated, a **Revision Notes** textarea appears above **Redraw** button for guided refinement
  - Slide sketches saved into `slides[n].sketch_url`; scene sketches into `scenes[n].sketch_url`; single into `raw_response.sketchUrl`
- Save to library (saves edited values + sketch URLs bundled into `raw_response`)

**URL query params** (pre-fill from Topics page):
`topic`, `format`, `pillar`, `platform`, `brandId`, `productId`, `objective`

**DB writes:** `generation_requests`, `generation_outputs`

---

### Topics Generator — `/topics`
**File:** `(dashboard)/topics/page.tsx`

Bulk content calendar generation.

**Features:**
- Select brand
- **Product selection mode:**
  - General — no product context
  - Mixed — auto-distribute topics across all active products
  - Specific — multi-select checkboxes to choose particular products
- Select platform
- Set date range (from / to)
- Set number of topics (1–30, slider, step 1)
- Optional objective filter
- **Reference & Context panel** (position 2, always visible):
  - Paste any URL → "Analyze" → `/api/scrape-url` extracts structured summary
  - Scraped `contextString` injected into generation prompt; at least half of topics should reflect the reference
  - Direction/notes textarea for manual guidance
- Generate → calls `/api/generate-topics`
- **Inline-editable topic cards**: title, pillar, format, date are all editable in the card
- **Per-card regeneration**: each card has a Regenerate button → revision context textarea → regenerates just that one topic
- Save all topics at once to `content_topics`
- Quick-link each topic to `/generate` pre-filled

**DB writes:** `content_topics`

---

### Topic Library — `/topic-library`
**File:** `(dashboard)/topic-library/page.tsx`

Manage saved topic calendar items.

**Features:**
- View all topics grouped by brand
- Filter by platform and status
- Summary stats: total topics, approved, generated
- Inline status change via dropdown
- Delete topics
- Quick-navigate to generate from a topic

**DB reads/writes:** `content_topics`, `brands`, `products`

---

### Campaigns — `/campaigns`
**File:** `(dashboard)/campaigns/page.tsx`

AI-powered campaign strategy brief generator.

**Form fields:**
- Campaign name
- Brand + product
- Objective
- Audience segment
- Flight dates (start / end)
- Budget range
- Key message
- Channel mix (multi-select)
- Cultural context (optional)

**Output sections:**
- Big Idea + Campaign Theme
- Message Pillars (3)
- Audience Insight
- Funnel Journey (Awareness → Consideration → Conversion)
- Channel Role Mapping
- Deliverables Recommendation
- KPI Recommendation
- Rationale

**DB writes:** `campaigns`, `campaign_outputs`

---

### Brand Brain — `/brands`
**File:** `(dashboard)/brands/page.tsx`

Manage brand identities and their AI context.

**Features:**
- Add / edit / delete brands via slide-out modal
- AI auto-fill from URLs:
  - Paste website or social media URLs
  - Click "Auto-fill AI" → calls `/api/scrape-brand`
  - Populates all form fields automatically
- Form sections:
  - **Overview:** name, category, summary
  - **Brand Voice:** tone of voice, personality, content language, platforms
  - **Brand DNA:** target audience, values, brand promise, USP
  - **Content Strategy:** content pillars, marketing strategy
  - **Do's & Don'ts:** dos[], donts[]
- Status toggle (active / inactive)
- Each save creates a new `brand_brain_versions` record

**DB writes:** `brands`, `brand_brain_versions`

---

### Product Brain — `/products`
**File:** `(dashboard)/products/page.tsx`

Manage products and their AI context.

**Features:**
- Products grouped by brand in a card grid
- Each card shows: product image, name, type, summary, USP preview, price tier
- Add / edit / delete via modal
- AI auto-fill from URLs:
  - **Product Sources** field at the top of modal
  - Paste product page or social media URLs
  - Click "Auto-fill AI" → calls `/api/scrape-product`
  - Populates: product type, price tier, summary, USP, RTB, benefits, target audience
- Image upload to Supabase Storage (`product_images` bucket)
- Product Brain fields: USP, RTB, Functional Benefits (JSON array), Emotional Benefits (JSON array), Target Audience
- Each save creates/updates a `product_brain_versions` record

**DB writes:** `products`, `product_brain_versions`

---

### Content Library — `/library`
**File:** `(dashboard)/library/page.tsx`

Browse and manage all generated content.

**Features:**
- Search by title or copy text
- Filter by status (all / approved / draft / rejected)
- Filter by platform
- Content card shows: title, platform badge, brand, product, status, created date
- Click row → opens platform mockup modal:
  - **Instagram (Carousel):** horizontal scroll-snap slider with per-slide sketch image + `1/N` counter badge + ◀▶ nav arrows
  - **Instagram (Reel/Video):** `InstagramReelsMockup` — storyboard carousel with IG header, per-scene `16:9` image + script text + visual direction
  - **Twitter/X (Carousel):** horizontal scroll-snap slider showing per-slide sketches
  - **TikTok / YouTube:** `VideoSceneCarousel` — per-scene `16:9` image panel (with scene badge + counter) + script text + visual direction in italic; ◀▶ nav arrows
  - **Other platforms:** generic mockup
- Copy-to-clipboard for caption and copy
- Inline status change (approve / reject / reset to draft)
- View carousel slides or video scenes inline in `ContentPanel`

**Image rendering in mockups:** Reads `raw_response.sketchUrl` (single image), `slides[n].sketch_url` (carousel), or `scenes[n].sketch_url` (video). Falls back to a grey placeholder if no image exists.

**DB reads/writes:** `generation_outputs`, `generation_requests`, `brands`, `products`

---

### Learning Center — `/learning`
**File:** `(dashboard)/learning/page.tsx`

Analytics and performance insights.

**Displays:**
- Overall stats: total outputs, approved count, draft count, rejected count, approval rate %
- Platform breakdown: count and approval rate per platform
- Objective breakdown: count per objective type
- Recent activity timeline

**DB reads:** `generation_outputs`, `generation_requests`, `brands`

---

### Settings — `/settings`
**File:** `(dashboard)/settings/page.tsx`

User profile and workspace management.

**Tabs:**
- **Profile:** edit full name and email
- **Workspace:** edit workspace name, slug, description, API limit
- **Team:** invite members by email with role, view pending invites, remove members, revoke invites

**Roles:** `admin` (full access + team management), `editor` (create/edit content), `viewer` (read-only)

**DB reads/writes:** `user_profiles`, `workspaces`, `user_workspace_roles`, `workspace_invitations`

---

### Workspace Settings — `/workspace-settings`
**File:** `(dashboard)/workspace-settings/page.tsx`

Workspace branding and administration.

**Tabs:**
- **Identity:** workspace name, description, logo URL, avatar color, avatar emoji
- **Members:** list all members with roles, invite new, revoke pending invites
- **Billing:** view API usage vs. limit, upgrade link (stub)
- **Danger Zone:** delete workspace

**DB reads/writes:** `workspaces`, `user_workspace_roles`, `workspace_invitations`, `user_profiles`

---

### Admin Panel — `/admin`
**File:** `(dashboard)/admin/page.tsx`

Superadmin-only. Requires `user_profiles.is_superadmin = true`.

**Features:**
- List all workspaces with member counts
- View members and invites per workspace
- Invite users to any workspace
- View all user profiles

**DB reads/writes:** `user_profiles`, `workspaces`, `user_workspace_roles`, `workspace_invitations`

---

## 7. API Routes

### `POST /api/generate`
Generate a single piece of social media content.

**Input:**
```ts
{
  brand: {
    name, industry, website, brandSummary, personality, toneOfVoice,
    brandPromise, brandValues: string[], audience, uniqueSellingPoints,
    contentLanguage, socialPlatforms: string[], contentPillars: string[],
    marketingStrategy, dos: string[], donts: string[],
    vocabularyWhitelist: string[], vocabularyBlacklist: string[]
  },
  product: {
    name, type, usp, rtb, keyClaims: string[],
    targetAudience, mandatoryDisclaimers, emotionalBenefits
  },
  platform: string,
  outputFormat: string,
  objective: string,
  framework: string,       // 'AIDA' | 'PAS' | 'BAB' | ''
  hookType: string,
  tone: string,
  visualStyle: string,
  outputLength: string,    // 'short' | 'medium' | 'long'
  additionalContext: string,
  referenceUrl: string,       // raw URL (fallback)
  referenceSummary: string,   // pre-formatted contextString from /api/scrape-url (preferred)
  language: string,           // 'id' | 'en'
  workspace_id: string
}
```

**Output:**
```ts
{
  success: boolean,
  output: {
    content_title: string,
    copy_on_visual: string,
    caption: string,
    slides?: { slide_number, copy_on_visual, visual_direction }[],  // carousels
    scenes?: { scene_number, script, visual_direction }[],           // videos
    cta_options: string[],
    hashtag_pack: string[],
    visual_direction: string,
    rationale: string
  },
  usage: {
    input_tokens: number,
    output_tokens: number,
    cache_creation_tokens: number,
    cache_read_tokens: number,
    cost_usd: number
  }
}
```

**AI model:** `claude-sonnet-4-20250514`  
**Max tokens:** 2000  
**Prompt caching:** Brand and product context sent as ephemeral cached blocks (24h TTL) — significantly reduces cost on repeat generations for the same brand.

---

### `POST /api/generate-topics`
Generate bulk content topic calendar.

**Input:**
```ts
{
  brand: { name, industry, toneOfVoice, personality, audience, brandSummary, contentPillars, socialPlatforms, marketingStrategy },
  products: { id, name, usp }[],  // array — empty for General mode, full list for Mixed, subset for Specific
  platform: string,
  count: number,           // 1–30
  dateFrom: string,        // YYYY-MM-DD
  dateTo: string,          // YYYY-MM-DD
  workspace_id: string,
  language: string,
  context: string,         // user direction notes
  referenceUrl: string,    // raw URL (fallback if no referenceSummary)
  referenceSummary: string // pre-formatted contextString from /api/scrape-url (preferred)
}
```

**Output:**
```ts
{
  success: boolean,
  topics: {
    content_title: string,
    content_pillar: string,
    content_format: string,
    publish_date: string,   // YYYY-MM-DD
    product_id?: string     // assigned when multiple products used
  }[]
}
```

**AI model:** `claude-sonnet-4-20250514`  
**Max tokens:** 2000

---

### `POST /api/scrape-url`
Fetch any URL and extract structured content for use as generation reference material.

**Input:**
```ts
{ url: string }
```

**Process:**
1. Validate URL format
2. Server-side fetch with 10s timeout; reject non-HTML content types
3. Strip HTML: remove script/style/nav/footer/header/aside blocks, replace block elements with newlines, decode entities, collapse whitespace
4. Truncate plain text to 5000 chars
5. Send to Claude Haiku for structured extraction
6. Build `contextString` — pre-formatted block for prompt injection

**Output:**
```ts
{
  success: boolean,
  url: string,
  extracted: {
    title: string,
    content_type: string,    // e.g. "Product Page", "Blog Post", "Landing Page"
    main_topic: string,
    key_claims: string[],
    tone: string,
    target_audience: string,
    summary: string,
    content_angles: string[]
  },
  contextString: string  // pre-formatted for direct prompt injection as REFERENCE MATERIAL
}
```

**AI model:** `claude-haiku-4-5-20251001`  
**Max tokens:** 600  
**Usage:** `contextString` is stored in UI state and passed as `referenceSummary` to `/api/generate` and `/api/generate-topics`. Claude is instructed to derive at least half of topics/content from this reference.

---

### `POST /api/generate-sketch`
Generate an AI reference image for a content slide, scene, or single post and return it as a Base64 Data URI (bypasses Supabase Storage entirely, avoiding RLS issues).

**File:** `src/app/api/generate-sketch/route.ts`

**Input:**
```ts
{ prompt: string }  // The slide/scene visual direction + copy, prefixed with brand/content context
```

**Process:**
1. Validate prompt is present
2. Prepend `"professional advertising photography, high resolution, sharp focus, commercial grade, cinematic composition, studio quality lighting, ultra-detailed"` as quality boosters (after the user prompt — does not override it)
3. Generate a random seed for variation
4. Fetch image from `image.pollinations.ai` at `768×768`, `model=flux`
5. Server-side proxy download → convert to Base64 string
6. Return as `data:image/jpeg;base64,...` URI (never touches Supabase Storage)

**Output:**
```ts
{
  success: boolean,
  sketchUrl: string   // Base64 data URI — can be used directly in <img src="..."/>
}
```

**Prompt enrichment (client side):** Before calling this API, `generate/page.tsx` calls `buildSketchPrompt(rawPrompt)` which prepends:
```
[Context: Brand: {name}, Product: {productName}, Content: {contentTitle}, Platform: {platform}] {rawPrompt}
```
This ensures subject consistency across all images in a carousel or storyboard.

**No AI model** — uses `image.pollinations.ai` (free, no API key required).

---

### `POST /api/generate-campaign`
Generate a full campaign strategy brief.

**Input:**
```ts
{
  brand: { name, category, personality, toneOfVoice, brandPromise, audience },
  product: { name, type, usp, targetAudience, emotionalBenefits },
  campaignName: string,
  objective: string,
  audienceSegment: string,
  flightStart: string,
  flightEnd: string,
  budgetRange: string,
  keyMessage: string,
  channelMix: string[],
  culturalContext: string,
  workspace_id: string
}
```

**Output:**
```ts
{
  success: boolean,
  output: {
    big_idea: string,
    campaign_theme: string,
    message_pillars: [string, string, string],
    audience_insight: string,
    funnel_journey: { awareness: string, consideration: string, conversion: string },
    channel_role_mapping: Record<string, string>,
    deliverables_recommendation: string[],
    kpi_recommendation: string[],
    rationale: string
  }
}
```

**AI model:** `claude-sonnet-4-20250514`  
**Max tokens:** 2000

---

### `POST /api/scrape-brand`
Extract brand information from website/social URLs.

**Input:**
```ts
{ url?: string, urls?: string[] }  // accepts single or multiple URLs
```

**Process:**
1. Normalize URLs (add `https://` if missing)
2. Try Jina Reader (`https://r.jina.ai/{url}`) first — returns clean Markdown, bypasses most bot blocks
3. If Jina returns < 200 chars (rate-limited / blocked), fall back to direct fetch + HTML stripping
4. Limit each URL to 8000 chars, total to 25000 chars
5. Send to Claude with structured extraction prompt
6. Parse and return JSON

**Output:**
```ts
{
  success: boolean,
  data: {
    name, industry, summary, tone_of_voice, brand_personality,
    target_audience, brand_values: string[], brand_promise,
    unique_selling_points, content_pillars: string[],
    social_media_platforms: string[], content_language,
    marketing_strategy, dos: string[], donts: string[]
  }
}
```

**AI model:** `claude-haiku-4-5-20251001`  
**Max tokens:** 1500  
**URL limit:** 5 URLs per call, 15s timeout per URL

---

### `POST /api/scrape-product`
Extract product information from website/social URLs.

**Input:** Same as `scrape-brand`

**Process:** Same as scrape-brand — Jina Reader with direct-fetch fallback → Claude extraction
> Note: `scrape-product` still uses Jina-only. If you see the same "Could not extract meaningful content" error there, apply the same `fetchWithFallback` pattern from `scrape-brand/route.ts`.

**Output:**
```ts
{
  success: boolean,
  data: {
    name, product_type, summary, usp, rtb,
    functional_benefits: string[], emotional_benefits: string[],
    target_audience, price_tier
  }
}
```

**AI model:** `claude-haiku-4-5-20251001`  
**Max tokens:** 1500

---

## 8. Workspace Context

**File:** `src/contexts/WorkspaceContext.tsx`

Provides active workspace state to all dashboard pages.

```ts
type WorkspaceBasic = {
  id: string
  name: string
  slug: string
  role: string              // 'admin' | 'editor' | 'viewer'
  logo_url?: string | null
  avatar_color?: string | null
  avatar_emoji?: string | null
  api_usage_usd?: number
  api_limit_usd?: number
}

type WorkspaceContextType = {
  activeWorkspace: WorkspaceBasic | null
  workspaces: WorkspaceBasic[]   // all workspaces the user belongs to
  workspaceId: string            // shorthand for activeWorkspace.id
  loading: boolean
  switchWorkspace: (id: string) => void
  createWorkspace: (name: string) => Promise<string | null>
  refreshWorkspaces: () => Promise<void>
}
```

**Persistence:** Active workspace ID stored in `localStorage` key `activeWorkspaceId`.  
**Default API limit:** $20 USD per new workspace.

---

## 9. Marketing Skills

**File:** `src/lib/skills/index.ts`

Prompt fragments injected into generation API routes to ensure consistent, high-quality AI output.

| Skill | Purpose |
|---|---|
| `copywritingSkill` | Best practices for marketing copy: clarity, benefits over features, specificity, authentic customer language, avoiding false claims |
| `socialContentSkill` | Platform-native content guidelines: casual/native for TikTok, visual-first for Instagram, professional for LinkedIn, etc. |

These are appended to the system prompt in `/api/generate` and `/api/generate-topics` to guide Claude's output style.

---

## 10. AI Models & Cost Tracking

### Models Used

| Model | ID | Used In | Characteristics |
|---|---|---|---|
| Claude Sonnet 4 | `claude-sonnet-4-20250514` | Content generation, topics, campaigns | High quality, supports prompt caching |
| Claude Haiku 4.5 | `claude-haiku-4-5-20251001` | Brand scraping, product scraping, URL scraping | Fast, cheap, good for extraction tasks |

### Pricing (Sonnet 4 with caching)

| Token type | Cost per 1M tokens |
|---|---|
| Input | $3.00 |
| Output | $15.00 |
| Cache creation | $3.75 (1.25× input) |
| Cache read | $0.30 (0.1× input) |

### Cost Tracking
- Every successful `/api/generate` call calculates `cost_usd` from token counts
- Cost is written to `workspaces.api_usage_usd` via `increment_api_usage(workspace_id, amount)` RPC
- Workspace `api_limit_usd` (default $20) is the spending cap
- Usage + limit displayed in Workspace Settings → Billing tab

### Prompt Caching Strategy
Brand and product brain context is sent as ephemeral cached blocks (TTL: ~1 hour within Claude's cache). On repeat generations for the same brand, cache reads cost ~10× less than full input tokens.

---

## 11. Feature Map

| Feature | Route | AI Model | Tables Written |
|---|---|---|---|
| Dashboard overview | `/` | — | — |
| Generate single post | `/generate` | Sonnet 4 | `generation_requests`, `generation_outputs` |
| Bulk topic calendar | `/topics` | Sonnet 4 | `content_topics` |
| Topic library | `/topic-library` | — | `content_topics` (status update) |
| Campaign strategy | `/campaigns` | Sonnet 4 | `campaigns`, `campaign_outputs` |
| Brand Brain manager | `/brands` | Haiku 4.5 (scrape) | `brands`, `brand_brain_versions` |
| Product Brain manager | `/products` | Haiku 4.5 (scrape) | `products`, `product_brain_versions` |
| Content library | `/library` | — | `generation_outputs` (status update) |
| Analytics | `/learning` | — | — |
| User + workspace settings | `/settings` | — | `user_profiles`, `workspaces`, `workspace_invitations` |
| Workspace branding + team | `/workspace-settings` | — | `workspaces`, `user_workspace_roles`, `workspace_invitations` |
| Superadmin | `/admin` | — | `workspace_invitations` |
| Reference URL scraping | `/api/scrape-url` | Haiku 4.5 | — (returns contextString for prompt injection) |

---

## Notes for Future Development

- **Versioning pattern:** Both Brand Brain and Product Brain use versioned tables (`brand_brain_versions`, `product_brain_versions`). The current implementation always uses the latest version. A full version history UI and rollback feature could be built from this.
- **`output_feedback_events` table** exists in the schema to track user edits (before/after values per section) — intended for a recommendation engine that learns which frameworks/hooks perform best per brand. Not yet surfaced in the UI.
- **`recommendation_profiles` table** exists for AI-personalized suggestions per brand — seeds data for the Home page "AI Recommendations" section. Currently populated manually.
- **`frameworks` and `hook_types`** are global seed data. Workspace-specific custom frameworks can be created (the schema supports it via `is_global = false`).
- **Language:** Default generation language is Indonesian (`'id'`). The language param flows through all generation API routes and affects Claude's output language.
- **Jina Reader** (`r.jina.ai`) is used as the scraping proxy for brand and product scraping — it converts any webpage to clean Markdown and bypasses most bot protection. No API key required, but the free tier rate-limits aggressively. `scrape-brand` now has a direct-fetch + HTML-strip fallback when Jina returns insufficient content. `scrape-product` still uses Jina-only and may need the same fix.
- **Storage bucket:** `product_images` in Supabase Storage. Images are stored at path `{workspace_id}/{random}_{timestamp}.{ext}` and served as public URLs.
