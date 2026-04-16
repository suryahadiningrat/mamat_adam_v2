# FCE Dashboard — Architecture Reference

> Deep-dive into how the system is designed. Read this when adding new features,
> debugging data flow, or making architectural decisions.
> Last updated: 2026-04-14

---

## System Overview

```
Browser (Next.js Client Components)
        │
        ├── WorkspaceContext (React Context)
        │         └── Stores activeWorkspaceId in localStorage
        │             Validates against DB on load
        │             All pages depend on workspaceId via useWorkspace()
        │
        ├── Supabase JS Client (src/lib/supabase.ts)
        │         └── Direct DB access for CRUD (brands, products, topics, library)
        │             RLS enforces workspace isolation at DB level
        │
        └── Next.js Route Handlers (/app/api/*)
                  └── Server-side only
                      Calls Anthropic Claude API
                      Calls Supabase for cost tracking
                      Never exposed to client directly
```

---

## Authentication Flow

1. User hits any `(dashboard)/*` route
2. `(dashboard)/layout.tsx` runs `ensureWorkspace(userId, email)`:
   - Upserts `user_profiles` record
   - Accepts ALL pending `workspace_invitations` for this email
   - If user has zero workspaces → creates a personal workspace + admin role
3. `WorkspaceProvider` mounts, loads workspaces from `user_workspace_roles`
4. Active workspace stored in `localStorage('activeWorkspaceId')`
5. All page `useEffect` hooks depend on `[workspaceId]` — switching workspace re-fetches all data without page reload

**Invited member flow:**
- Admin adds email → inserted directly into `user_workspace_roles` if profile exists, else into `workspace_invitations`
- On next login, `ensureWorkspace` picks up pending invitations and converts them

---

## Multi-Tenancy Model

```
workspaces
    ├── user_workspace_roles  (membership + role: admin/member)
    ├── brands                (workspace_id FK)
    │     └── brand_brain_versions
    ├── products              (workspace_id + brand_id FK)
    │     └── product_brain_versions
    ├── content_topics        (workspace_id + brand_id + product_id)
    ├── generation_requests   (workspace_id + brand_id + product_id)
    │     └── generation_outputs
    └── workspace_invitations
```

RLS policies ensure every query is scoped to the authenticated user's workspaces.
**Critical:** Any new table must have `workspace_id` column + RLS policy.

---

## Brand Brain Data Model

The Brand Brain is split across two levels:

### Core columns (`brand_brain_versions`)
| Column | Type | Purpose |
|---|---|---|
| `tone_of_voice` | text | e.g. "Warm, Professional, Approachable" |
| `brand_personality` | text | e.g. "The Wise Friend" |
| `audience_persona` | jsonb | Target audience description |
| `brand_values` | jsonb | Array of value strings |
| `brand_promise` | text | Core USP / brand promise |
| `source_summary` | text | Auto-populated from website scrape |

### Extended fields (`messaging_rules` JSONB)
Stored as a single JSONB column to avoid schema migrations for new brand attributes:
```json
{
  "website": "https://...",
  "industry": "Insurance",
  "content_language": "Indonesian",
  "social_media_platforms": ["Instagram", "TikTok"],
  "content_pillars": ["Education", "Lifestyle", "Product"],
  "marketing_strategy": "...",
  "unique_selling_points": "...",
  "dos": ["Be authentic", "Use real stories"],
  "donts": ["Never use fear tactics"]
}
```

**Parsing:** Always use `parseExt(brand.brand_brain_versions[0]?.messaging_rules)` — see `generate/page.tsx` for the canonical implementation.

---

## Content Generation Architecture

### Single Content (`/api/generate`)
```
generate/page.tsx
  → builds brand + product payload from brain data
  → POST /api/generate
      → builds prompt (brand context + product context + skills)
      → calls claude-sonnet-4-5 (or haiku for lighter tasks)
      → returns GeneratedOutput { content_title, copy_on_visual, caption,
                                   slides[], scenes[], cta_options[],
                                   hashtag_pack[], visual_direction, rationale }
  → displays editable output fields
  → "Approve" → saves to generation_requests + generation_outputs
```

### Topic Generation (`/api/generate-topics`)
```
topics/page.tsx
  → form: brand, product mode (general/mixed/specific), platform, count(1-30),
          date range, context, referenceUrl, referenceSummary
  → POST /api/generate-topics
      → returns array of { content_title, content_pillar, content_format,
                           publish_date, product_id? }
  → TopicCard: inline-editable, per-card regenerate with revision context
  → "Save All" → bulk insert to content_topics
```

### Reference URL Scraping (`/api/scrape-url`)
```
User pastes URL → clicks "Analyze"
  → POST /api/scrape-url
      → server-side fetch URL (10s timeout)
      → strip HTML to plain text (5000 char limit)
      → claude-haiku extracts: title, content_type, main_topic,
                                key_claims, tone, target_audience,
                                summary, content_angles
      → returns { extracted, contextString }
  → contextString injected into generation prompt as REFERENCE MATERIAL
  → At least half of generated topics should reflect reference content
```

### AI Image Generation (`/api/generate-sketch`)
```
User clicks "Draw Image" on a slide / scene / single post
  → generate/page.tsx calls buildSketchPrompt(rawVisualDirection)
      → prepends [Context: Brand, Product, Content, Platform]
        ensuring all images in a batch share the same subject matter
  → POST /api/generate-sketch { prompt: enrichedPrompt }
      → appends quality booster suffix (photography/commercial terms)
      → server-side fetch from image.pollinations.ai (flux model, 768×768)
      → downloads image bytes → converts to Base64 data URI
      → returns { success, sketchUrl: "data:image/jpeg;base64,..." }
  → UI stores sketchUrl in local state:
      - Single post   → sketchUrl state → saved in raw_response.sketchUrl
      - Carousel slide → slideSketches[idx] → updateSlide → saved in slides[n].sketch_url
      - Video scene   → sceneSketches[idx] → updateScene → saved in scenes[n].sketch_url
  → "Save to Library" bundles all sketch URLs into the DB record
  → Library mockups read sketch URLs from DB and render in platform UI frames
```

### Marketing Skills (`src/lib/skills/index.ts`)
`copywritingSkill` and `socialContentSkill` are injected verbatim into every generation prompt inside `<copywriting_skill>` and `<social_content_skill>` XML tags. These are large pre-written marketing framework texts — they significantly improve output quality.

---

## API Cost Tracking

Every Claude API call:
1. Captures `usage.input_tokens`, `usage.output_tokens`, `usage.cache_read_input_tokens`
2. Calculates cost: `(input/1M * rate) + (output/1M * rate)`
3. Calls `supabase.rpc('increment_api_usage', { p_workspace_id, p_amount })`
4. Updates `workspaces.api_usage_usd`

Model rates:
- `claude-haiku-4-5-20251001`: $0.80/M input, $4.00/M output (topics, scraping)
- `claude-sonnet-4-5-20250514`: higher rate (full content generation)

---

## Theme System

`next-themes` (`ThemeProvider`) sets `data-theme="dark|light"` on `<html>`.
All colors are CSS custom properties in `globals.css`:

```css
/* Light mode */
[data-theme='light'] {
  --accent: #5B479D;
  --accent-alt: #FBB040;
  --accent-alt-text: #1a1a1a;  /* dark text on amber buttons */
  --surface-1: #f5f5f7;
  ...
}

/* Dark mode (default) */
:root {
  --accent: #7C68C4;  /* lightened purple for visibility on dark */
  --accent-alt: #FBB040;
  ...
}
```

Button variants: `.btn-primary` (purple), `.btn-accent` (amber, dark text), `.btn-secondary` (muted), `.btn-ghost` (outlined)

---

## Sidebar Workspace Dropdown — Known Quirk

The sidebar has `overflow-y: auto` which clips `position: absolute` children.
Solution: dropdown uses `position: fixed` + `getBoundingClientRect()` calculated at open time:
```tsx
const rect = pillRef.current.getBoundingClientRect()
setDropdownRect({ top: rect.bottom + 6, left: rect.left, width: rect.width })
// Rendered via React portal outside <aside>, z-index: 9000
```

---

## SQL Migration Files

Migrations are stored as `.sql` files in the project root (not in a migrations folder):

| File | Purpose |
|---|---|
| `supabase-schema.sql` | Full initial schema |
| `fix_rls_patch.sql` | Workspace SELECT policy |
| `migrate_content_topics.sql` | Adds `objective` column to content_topics |
| `migrate_workspace_branding.sql` | Adds `logo_url`, `avatar_color`, `avatar_emoji` to workspaces |
| `migrate_workspace_rls.sql` | UPDATE + INSERT policies for workspaces |

**To apply:** Paste into Supabase SQL Editor → Run.

---

## Key Architectural Decisions & Why

| Decision | Reason |
|---|---|
| All pages are Client Components (`'use client'`) | Simpler state management for a dashboard with heavy interactive UI; SSR not needed |
| `messaging_rules` JSONB instead of separate columns | Avoids migrations for every new brand attribute; all extended brand fields live here |
| `WorkspaceContext` instead of page-level workspace queries | Single source of truth; switching workspace re-triggers all page effects without page reload |
| `position: fixed` sidebar dropdown | Sidebar `overflow-y: auto` clips `position: absolute` children |
| Haiku for topics/scraping, Sonnet for content generation | Topics and scraping need speed + low cost; full content generation needs quality |
| Skills injected as XML tags in prompts | Claude handles XML-delimited context better than plain text injection |
| Base64 Data URI for generated images (not Supabase Storage) | Supabase Storage RLS policies blocked uploads from server-side API routes; Base64 sidesteps storage entirely and is rendered natively by the browser |
| Context-prefix pattern in sketch prompts (`buildSketchPrompt`) | Without brand/product context, the image AI defaults to generic subjects (e.g. car instead of motorcycle). Prefixing every prompt with `[Context: Brand, Product, Content]` anchors all images to the correct subject across a batch |
| Inner-function React components in library/page.tsx | `VideoSceneCarousel`, `InstagramMockup` etc. are defined as sub-functions inside `LibraryPage` so they can close over shared helpers. They use `useRef` correctly because they render as JSX components |
