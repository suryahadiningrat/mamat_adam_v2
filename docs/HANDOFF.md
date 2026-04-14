# FCE Dashboard — Session Handoff

> Update this file at the END of every session.
> Start every new session by reading this file + CLAUDE.md.
> This is the single source of truth for "where we left off."

---

## How to Update This File

At the end of any session, ask your AI:
> "Update HANDOFF.md with everything completed today, what's in progress, what comes next, and any gotchas to remember."

---

## Last Updated: 2026-04-14

### Completed This Session (2026-04-14)

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
| Product Brain `/products` | ✅ Complete | CRUD + brain versions |
| Topic Generator `/topics` | ✅ Complete | Multi-product modes, reference URL, per-card regen, editable |
| Topic Library `/topic-library` | ✅ Complete | Calendar view of saved topics |
| Content Generator `/generate` | ✅ Complete | All output fields editable, reference URL, revision regen |
| Content Library `/library` | ✅ Complete | Approve/reject/draft actions |
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
