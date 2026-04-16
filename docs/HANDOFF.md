# FCE Dashboard — Session Handoff

> Update this file at the END of every session.
> Start every new session by reading this file + CLAUDE.md.
> This is the single source of truth for "where we left off."

---

## How to Update This File

At the end of any session, ask your AI:
> "Update HANDOFF.md with everything completed today, what's in progress, what comes next, and any gotchas to remember."

---

## Last Updated: 2026-04-16

### Completed This Session (2026-04-16)

**Product Brain — search & filter:**
- Added search bar (searches name, product type, summary, USP) + brand dropdown filter to `/products` page
- Results update live (client-side); when filters active, result count shown; empty state for no matches
- Card grid view preserved; brand group headers update dynamically to only show brands with matching products

**Language fix — Topic Generator & Content Generator:**
- Both pages were sending no `language` field to their respective API routes, so the API defaulted to hardcoded `'Indonesian'`
- Fixed by passing `language: ext.content_language || 'Indonesian'` in the fetch body for:
  - `generate/page.tsx` → `/api/generate`
  - `topics/page.tsx` → `/api/generate-topics` (both `handleGenerate` and `handleRegenerateOne`)
- The brand's configured `content_language` from `messaging_rules` JSONB now actually drives output language

**Topic save error — VARCHAR(255) overflow:**
- `content_topics.content_title` is `character varying(255)` but AI occasionally generates longer titles
- Fixed with two layers: (1) added `"Keep content_title under 100 characters"` rule to generate-topics prompt; (2) `.substring(0, 255)` truncation on save in `handleSaveAll` as a hard safety net

**Content pillar selection — Topic Generator & Content Generator:**
- Both generators were mixing all brand content pillars freely, with no way to restrict generation to specific pillars
- Topic Generator (`/topics`): Added multi-select pillar toggle UI; `selectedPillars` passed to API; API enforces single or multiple pillar constraints with "MANDATORY" language
- Content Generator (`/generate`): Added single-select pillar picker in Context panel; `contentPillar` passed to API; API adds hard constraint to prompt
- Both generators show pillar constraint in API calls: single pillar → "ALL N topics MUST", multiple → "ONLY use these content pillars"

**Topic Generator → Content Generator pre-fill (product_id fix):**
- When a single product was selected in Topic Generator, the generated topic had no `product_id` (API only embeds `product_id` when `products.length > 1`)
- Fixed by computing `defaultProductId` in the render loop and passing it to `TopicCard` as a prop
- `TopicCard` uses `resolvedProductId = topic.product_id || defaultProductId || ''` when building the generate URL

**Content generator — full brain context fix:**
- Product brain fields were partially mapped; `rtb`, `functional_benefits`, `emotional_benefits` were missing from the API payload
- Fixed `promptProductPayload` to include all product brain version fields
- Fixed `audience_persona` JSONB serialization (was sending object reference instead of string)
- Changed sequential brand/product fetches to `Promise.all` + added `urlParamsApplied` ref to prevent URL params applying before both datasets are loaded

**Topic Library — flat table layout:**
- Replaced grouped accordion view with a flat table (Topic Title, Brand, Pillar, Format, Platform, Date, Status, Actions)
- Added search bar + brand, platform, status filter dropdowns (all client-side)
- All generate links open in a new tab

**Content Library — brand filter:**
- Added brand dropdown filter beside the existing search bar
- Also added `content_title` to the search match fields

**Topic Generator — "Generate Content" button after save:**
- Previously the button disappeared after saving a topic
- Now saved state shows both the "Saved" indicator and a "Generate Content →" link
- Both saved and unsaved generate links open in a new tab (`target="_blank"`)

---

### Completed in Previous Sessions (pre-2026-04-14)

**AI Sketch / Image Generation — full refactor & quality improvements:**
- **Image generation prompt overhaul:** Removed the conflicting `flux-anime` model and storyboard sketch wrapper that fought against Claude's visual direction. Now uses the standard `flux` model at `768×768` with professional advertising photography quality boosters appended.
- **Context-aware image prompts (`buildSketchPrompt`):** Every sketch prompt (single, slide, scene) is now prefixed with `[Context: Brand: X, Product: Y, Content: Z, Platform: P]` so that all images across a carousel or video storyboard stay subject-consistent (e.g. always motorcycle, not car).
- **Button labels updated:** All "Sketch" / "Generate Sketch" / "Regenerate Sketch" labels renamed to "Draw Image" / "Redraw Image" throughout `generate/page.tsx`.
- **Revision notes for Redraw:** After any image is generated, a revision textarea appears above the "Redraw" button for slides and scenes. Notes are appended to the prompt as `Revise: [notes]`.

**Content Library — mockup layout improvements:**
- **Instagram Carousel mockup:** Replaced static single image with a horizontal scroll-snap slider. Each slide shows its `sketch_url` with a `1/7` counter badge. Left/right chevron buttons added for desktop navigation.
- **TikTok + YouTube → Video Storyboard Carousel:** Both mockups rebuilt as `VideoSceneCarousel` — shared component that iterates over `item.scenes`, showing per-scene: `16:9` image panel (with scene badge + counter), Script text, visual direction in italic below. Prev/next arrow buttons overlaid.
- **Instagram Reels mockup:** Added `InstagramReelsMockup` component. `renderMockup()` now detects when platform = Instagram AND output_format contains "reel" or "video" and routes to the storyboard carousel view instead of the static image mockup.
- **Sketch URLs saved to DB:** When "Save to Library" is clicked in the generator, `sketchUrl` is now merged into `raw_response` JSONB (`{ ...output, sketchUrl }`), persisting it for library rendering.
- **Library fetches `raw_response`:** The Supabase select query in `library/page.tsx` now includes `raw_response` so that saved sketch URLs can be rendered in mockups.

### Completed in Previous Sessions
- Reference URL feature fully implemented for both Topic Generator and Content Generator
  - `/api/scrape-url` — fetches page, strips HTML, extracts structured data via Claude Haiku
  - Returns: `title`, `content_type`, `main_topic`, `key_claims`, `tone`, `content_angles`, `contextString`
  - `contextString` is injected into generation prompts as REFERENCE MATERIAL with explicit instruction to derive at least half of topics from it
- Reference & Context panel repositioned to appear after Context (brand/product selection) in both generators — always visible, not hidden in advanced mode
- Content Generator: Reference URL and Additional Context moved out of advanced mode, now visible in basic mode
- Topic Generator: Additional Context panel removed and merged into new "Reference & Context" panel (position 2 in left panel stack)
- All output fields in Content Generator are now editable before saving (copy, caption, CTAs, hashtags, visual direction, rationale)
- Per-card regeneration in Topic Generator: each card has Regen button → revision context textarea → regenerates single topic
- Content Generator: Regenerate button opens revision context panel instead of regenerating immediately
- Topic count range changed from 5-30 (step 5) to 1-30 (step 1)
- Product selection modes added: General / Mixed (auto-distribute) / Specific (multi-select checkboxes)
- Brand Brain redesign plan exists (see plan file) — NOT YET IMPLEMENTED

### Current Status: What's Built
All 11 pages are functional and wired to Supabase + Claude:

| Page | Status | Notes |
|---|---|---|
| Dashboard `/` | ✅ Complete | Real KPIs from DB |
| Brand Brain `/brands` | ✅ Complete | CRUD + brain versions. Extended redesign pending (see plan) |
| Product Brain `/products` | ✅ Complete | CRUD + brain versions + search/brand filter |
| Topic Generator `/topics` | ✅ Complete | Multi-product modes, content pillar selection, reference URL, per-card regen, editable |
| Topic Library `/topic-library` | ✅ Complete | Flat table with search + brand/platform/status filters |
| Content Generator `/generate` | ✅ Complete | Full brain context, content pillar selection, language-aware, all output fields editable, reference URL, revision regen |
| Content Library `/library` | ✅ Complete | Approve/reject/draft actions + brand filter |
| Campaign Generator `/campaigns` | ✅ Complete | Campaign brief generation |
| Learning Center `/learning` | ✅ Complete | Real DB analytics |
| Settings `/settings` | ✅ Complete | Profile + workspace, invite members |
| Workspace Settings `/workspace-settings` | ✅ Complete | Identity, members, billing, danger zone |

### Pending / Next Up

**High priority:**
- [ ] **All-slides/all-scenes batch "Draw Image" button** — currently each slide/scene must be drawn individually. Add a single "Draw All Images" button that queues all in sequence.
- [ ] **Sketch revision for single image** — the single-image (non-carousel) view doesn't yet have a revision textarea like slides/scenes do. Add parity.
- [ ] **Library: Facebook Reels** — `renderMockup` doesn't have a Facebook-specific handler yet. Currently falls back to `GenericMockup`.
- [ ] Favicon — user asked for it, not implemented yet (needs logo file at `public/floothink-logo.png`)

**Medium priority:**
- [ ] Apply any pending SQL migrations (check `fix_rls_patch.sql` if workspace SELECT issues appear)
- [ ] Consider adding Jina API key to env vars (`JINA_API_KEY`) for higher rate limits on brand/product scraping — currently free-tier Jina is unreliable
- [ ] Library: LinkedIn and Twitter carousel mockups don't yet have the multi-slide storyboard view — only Instagram and Twitter single-image do.

**Low priority / Future:**
- [ ] PDF reference support in scrape-url (currently returns error for PDFs)
- [ ] Social media URL scraping (currently blocked by auth walls)
- [ ] Admin API key for auto monthly cost sync (pending user provision of key)

### Gotchas & Known Issues

- **Image generation prompt vs. visual direction conflict:** The old `flux-anime` wrapper prepended "storyboard sketch, black and white line art" which directly contradicted Claude's rich visual direction output (e.g. "warm orange gradient"). Now fixed — the prompt trusts the visual direction and appends quality boosters only.
- **Subject drift across images:** Without the `buildSketchPrompt` context header, the AI defaults to the most generic interpretation of a scene (car instead of motorcycle). Always make sure `buildSketchPrompt()` is called in `handleGenerateSketch` — do not pass raw `promptText` directly to the fetch.
- **`sketchUrl` is Base64 data URI:** The `/api/generate-sketch` route returns a Base64-encoded image (not a Supabase Storage URL). Do not try to parse it as a URL or upload it. Saved into `raw_response.sketchUrl` in the DB as a full base64 string — can be very large.
- **Jina Reader rate limits**: `r.jina.ai` is used in `scrape-brand` and `scrape-product` to fetch URLs. Without a `JINA_API_KEY`, it rate-limits aggressively and returns near-empty responses (HTTP 200 but < 200 chars). `scrape-brand` now has a direct-fetch fallback. `scrape-product` uses the same Jina-only pattern — if the same error appears there, apply the same `fetchWithFallback` fix.
- **Supabase RLS silent failures**: UPDATE blocked by RLS returns success, 0 rows affected. Always re-fetch to confirm.
- **Brand Brain `messaging_rules` JSONB**: Extended brand fields (industry, website, content_pillars, dos, donts, etc.) live inside this single JSONB column. Use `parseExt()` in both page and API files.
- **`brain_brain_versions` join**: Returns an array even for single record. Always normalize: `Array.isArray(x) ? x[0] : x`
- **Floothink logo**: Sidebar references `/floothink-logo.png`. File must exist in `public/` — if sidebar shows broken image, this file is missing.
- **Dark mode logo inversion**: `[data-theme='dark'] .sidebar-logo img { filter: brightness(0) invert(1) }` — auto-converts purple logo to white.
- **`content_topics.objective` column**: Was missing originally, needed `ALTER TABLE content_topics ADD COLUMN IF NOT EXISTS objective varchar(100)` — should already be applied.
- **Workspace brands not showing**: Brands created before workspace fix have `workspace_id = null`. Heal query in brands page must NOT filter by `created_by` or it blocks the heal.
- **`useRef` in inner functions**: `VideoSceneCarousel`, `InstagramMockup`, and `TwitterMockup` are inner functions inside `LibraryPage`. They use `useRef` correctly because they are React function components rendered via JSX — this works fine. Do not hoist them outside the parent component as they depend on `item` from closure.
- **Language must be explicitly passed to API routes**: `brand.contentLanguage` in the brand payload is only a reference field in the prompt. The actual output language instruction is driven by the top-level `language` param. Both `generate/page.tsx` and `topics/page.tsx` must pass `language: ext.content_language || 'Indonesian'` in the fetch body — it is not derived automatically from the brand payload.
- **`content_topics.content_title` is VARCHAR(255)**: The AI sometimes generates topic titles longer than 255 chars. Always truncate before inserting: `content_title.substring(0, 255)`. The generate-topics prompt now includes a 100-char guideline but the truncation in `handleSaveAll` is the hard safety net.

---

## Session Template

Copy this block when starting a new session update:

```markdown
## Last Updated: YYYY-MM-DD

### Completed This Session
- 

### Pending / Next Up
- [ ] 

### Gotchas & Known Issues
- 
```
