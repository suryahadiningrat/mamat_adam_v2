# FCE Dashboard — AI Context File

> This file is auto-loaded by Claude Code at the start of every session.
> Any AI assistant should read this file first before touching any code.
> Last updated: 2026-04-16

---

## What This Project Is

**FCE (Floothink Content Engine)** — a multi-workspace SaaS dashboard for AI-powered content marketing.
Built for Indonesian/Southeast Asian market brands. Users define a Brand Brain and Product Brain, then generate social media content, topic calendars, and campaigns using Claude.

**Owner:** Floothink (adamfloothink)
**Stack:** Next.js 14 App Router · Supabase (Postgres + Auth + RLS) · Anthropic Claude API · Vercel
**Local dev:** `npm run dev` → http://localhost:3000
**Repo:** GitHub (main branch = production)

---

## Project Structure

```
src/
  app/
    (dashboard)/          ← All authenticated pages (layout.tsx wraps with auth + WorkspaceProvider)
      page.tsx            ← Dashboard home
      brands/             ← Brand Brain CRUD
      products/           ← Product Brain CRUD
      topics/             ← Topic Generator (bulk content calendar)
      topic-library/      ← Saved topics calendar view
      generate/           ← Content Generator (single post)
      library/            ← Content Library (approved/draft/rejected outputs)
      campaigns/          ← Campaign Generator
      learning/           ← Analytics & learning center
      settings/           ← User profile + workspace settings
      workspace-settings/ ← Workspace identity, members, billing, danger zone
      admin/              ← Admin panel
    api/
      generate/           ← POST: single content generation via Claude
      generate-topics/    ← POST: bulk topic generation via Claude
      generate-campaign/  ← POST: campaign brief generation via Claude
      generate-sketch/    ← POST: AI image via pollinations.ai → returns Base64 data URI
      scrape-brand/       ← POST: fetch URL → extract brand info via Claude
      scrape-product/     ← POST: fetch URL → extract product info via Claude
      scrape-url/         ← POST: fetch any URL → structured summary for reference context
    login/ signup/        ← Auth pages
  components/
    Sidebar.tsx           ← Nav + workspace switcher (position:fixed dropdown escapes overflow)
    Topbar.tsx            ← Search + theme toggle + user avatar
    ThemeProvider.tsx     ← next-themes wrapper
  contexts/
    WorkspaceContext.tsx  ← Active workspace state, switchWorkspace, createWorkspace
  lib/
    supabase.ts           ← Supabase client singleton
    skills/index.ts       ← copywritingSkill + socialContentSkill (injected into generation prompts)
```

---

## Core Patterns — Follow These Always

### 1. Workspace isolation
Every page uses `useWorkspace()` from `WorkspaceContext`:
```tsx
const { workspaceId } = useWorkspace()
useEffect(() => { if (workspaceId) loadData() }, [workspaceId])
```
All Supabase queries filter by `workspace_id`. Never fetch without it.

### 2. Supabase join normalization
Brain version joins return arrays — always normalize:
```ts
const brain = Array.isArray(brand.brand_brain_versions)
  ? brand.brand_brain_versions[0]
  : brand.brand_brain_versions
```

### 3. API route structure
All routes at `/api/*`:
- Accept POST JSON body
- Read `ANTHROPIC_API_KEY` from `process.env`
- Call Claude (model: `claude-haiku-4-5-20251001` for light tasks, Sonnet for complex)
- Call `supabase.rpc('increment_api_usage', { p_workspace_id, p_amount })` to track cost
- Return `{ success: true, ...data }` or `{ error: string }`

### 4. Theme system
`data-theme="dark"` or `"light"` on `<html>`. CSS variables defined in `globals.css`:
- Surfaces: `--surface-1/2/3/4`, `--border`, `--border-accent`
- Text: `--text-primary/secondary/tertiary`
- Brand colors: `--accent: #5B479D` (light) / `#7C68C4` (dark), `--accent-alt: #FBB040`
- Semantic: `--green`, `--red`, `--amber`, `--blue`

### 5. Design system classes
`.panel`, `.panel-header`, `.panel-title` — card containers
`.btn.btn-primary` (purple), `.btn-secondary` (muted), `.btn-accent` (amber), `.btn-ghost` (outlined)
`.page-header.page-header-row` — page title + action button row
`.fade-up.fade-up-1` through `.fade-up-5` — staggered entrance animations
`.kpi-grid`, `.kpi-card` — dashboard metrics layout

### 6. RLS / silent failures
Supabase UPDATE blocked by RLS returns success with 0 rows (no error thrown).
Always check `count` or re-fetch to confirm writes landed.

### 7. Image generation pattern (`/api/generate-sketch`)
Do not store generated images in Supabase Storage — RLS blocks server-side uploads.
Always return images as Base64 data URIs from the API. Key rules:
- Build the prompt with `buildSketchPrompt(rawPrompt)` in `generate/page.tsx` — this prefixes every request with `[Context: Brand, Product, Content, Platform]` to prevent subject drift across a batch
- The quality booster suffix is appended *after* the user prompt in the API, so it never overrides the visual direction
- `sketchUrl` values are Base64 strings — they can be very large. They are stored in `raw_response.sketchUrl` (single), `slides[n].sketch_url`, or `scenes[n].sketch_url` in the DB
- Library mockups detect the format (`output_format` field) to pick the right mockup component: Carousel → slide slider, Reel/Video → `VideoSceneCarousel`, Static → single image

---

## Data Model (key tables)

| Table | Purpose |
|---|---|
| `workspaces` | Multi-tenant root. Has `api_usage_usd`, `api_limit_usd`, branding fields |
| `user_workspace_roles` | Membership: `user_id`, `workspace_id`, `role` (admin/member) |
| `workspace_invitations` | Pending email invites — processed by `ensureWorkspace()` on login |
| `user_profiles` | `id` = auth.uid(), `email`, `full_name` |
| `brands` | Brand record with `workspace_id` FK |
| `brand_brain_versions` | Versioned brand strategy. Key cols: `tone_of_voice`, `brand_personality`, `audience_persona` (JSONB), `brand_values` (JSONB), `brand_promise`, `source_summary`, `messaging_rules` (JSONB — stores industry, website, content_pillars, dos, donts, etc.) |
| `products` | Product with `brand_id` + `workspace_id` |
| `product_brain_versions` | `usp`, `functional_benefits`, `key_claims`, `target_audience`, etc. |
| `content_topics` | Generated topics: `brand_id`, `product_id`, `platform`, `content_title`, `content_pillar`, `content_format`, `publish_date`, `objective`, `status` |
| `generation_requests` | Log of each generation run |
| `generation_outputs` | Generated content: `content_title`, `copy_on_visual`, `caption`, `slides` (JSONB), `scenes` (JSONB), `cta_options`, `hashtag_pack`, `visual_direction`, `rationale`, `status` |

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=          ← server-side only, never in client code
```

---

## What NOT to Do

- Never query Supabase without a `workspace_id` filter
- Never expose `ANTHROPIC_API_KEY` in client components — only in `/api/*` route handlers
- Never amend existing commits — always create new ones
- Don't add features beyond what's asked — this codebase is production-bound
- The `messaging_rules` JSONB column stores extended brand fields (website, industry, content_pillars, dos, donts, content_language, social_media_platforms, marketing_strategy, unique_selling_points) — don't create new columns for these
- **Language param**: `brand.contentLanguage` in the payload is a reference field only. The actual output language instruction is the top-level `language` param. Always pass `language: ext.content_language || 'Indonesian'` explicitly in the fetch body when calling `/api/generate` or `/api/generate-topics`
- **`content_topics.content_title` is VARCHAR(255)**: always truncate AI-generated titles with `.substring(0, 255)` before inserting to avoid DB errors

---

## Quick Reference — Where Things Are

| Question | Answer |
|---|---|
| How does auth work? | `(dashboard)/layout.tsx` — `ensureWorkspace()` runs on every login, creates workspace if none exists, processes pending invitations |
| How does workspace switching work? | `WorkspaceContext.tsx` — stores active ID in localStorage, all page effects depend on `workspaceId` |
| Where are Claude prompts? | Inside each `/api/*/route.ts` — prompts are built inline, not in separate files |
| Where are the marketing skill prompts? | `src/lib/skills/index.ts` — injected into topic and content generation prompts |
| Where is the theme toggle? | `Topbar.tsx` — uses `next-themes` `useTheme()` hook |
| Where is the sidebar workspace dropdown? | `Sidebar.tsx` — uses `position: fixed` + `getBoundingClientRect()` to escape `overflow-y: auto` clipping |

---

*For full deployment instructions, see `docs/DEPLOYMENT.md`*
*For current build status and session handoff, see `docs/HANDOFF.md`*
*For architecture deep-dive, see `docs/ARCHITECTURE.md`*
*For full API/schema/page reference, see `docs/DOCUMENTATION.md`*
