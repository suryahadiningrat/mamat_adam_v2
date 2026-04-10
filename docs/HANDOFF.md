# FCE Dashboard — Session Handoff

> Update this file at the END of every session.
> Start every new session by reading this file + CLAUDE.md.
> This is the single source of truth for "where we left off."

---

## How to Update This File

At the end of any session, ask your AI:
> "Update HANDOFF.md with everything completed today, what's in progress, what comes next, and any gotchas to remember."

---

## Last Updated: 2026-04-10

### Completed This Session
- **Documentation centralized** — all docs moved into `docs/` folder:
  - `DOCUMENTATION.md` → `docs/DOCUMENTATION.md` (updated with all features from this session)
  - `DEPLOYMENT.md` → `docs/DEPLOYMENT.md`
  - `CLAUDE.md` stays at root (required for Claude Code auto-loading)
  - `CLAUDE.md` updated to point to `docs/DEPLOYMENT.md` and `docs/DOCUMENTATION.md`
- **Session start/end prompts created** — two reusable prompts for efficient AI context loading and end-of-session doc updates (stored outside repo, in user's notes)
- **Fixed `scrape-brand` "Could not extract meaningful content" error**:
  - Root cause: Jina Reader (`r.jina.ai`) rate-limits aggressively without an API key, returning near-empty responses that pass the HTTP check but fail the content length check
  - Fix: `fetchWithFallback()` function added — tries Jina first, falls back to direct fetch + HTML stripping (same approach as `scrape-url`) if Jina returns < 200 chars
  - File changed: `src/app/api/scrape-brand/route.ts`

### Completed in Previous Session
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
- [ ] Brand Brain comprehensive redesign (plan exists at `~/.claude/plans/enumerated-singing-forest.md`)
  - Fix orphaned brands (workspace_id = null not appearing)
  - Add full brand form: website scrape, tone, pillars, platforms, dos/donts
  - Update generate page to pass full brand payload
- [ ] Favicon — user asked for it, not implemented yet (needs logo file at `public/floothink-logo.png`)

**Medium priority:**
- [ ] Image generation integration — user has kie.ai API key, waiting on API docs
- [ ] Apply any pending SQL migrations (check `fix_rls_patch.sql` if workspace SELECT issues appear)
- [ ] Consider adding Jina API key to env vars (`JINA_API_KEY`) for higher rate limits on brand/product scraping — currently free-tier Jina is unreliable

**Low priority / Future:**
- [ ] PDF reference support in scrape-url (currently returns error for PDFs)
- [ ] Social media URL scraping (currently blocked by auth walls)

### Gotchas & Known Issues

- **Jina Reader rate limits**: `r.jina.ai` is used in `scrape-brand` and `scrape-product` to fetch URLs. Without a `JINA_API_KEY`, it rate-limits aggressively and returns near-empty responses (HTTP 200 but < 200 chars). `scrape-brand` now has a direct-fetch fallback. `scrape-product` uses the same Jina-only pattern — if the same error appears there, apply the same `fetchWithFallback` fix.
- **Supabase RLS silent failures**: UPDATE blocked by RLS returns success, 0 rows affected. Always re-fetch to confirm.
- **Brand Brain `messaging_rules` JSONB**: Extended brand fields (industry, website, content_pillars, dos, donts, etc.) live inside this single JSONB column. Use `parseExt()` in both page and API files.
- **`brain_brain_versions` join**: Returns an array even for single record. Always normalize: `Array.isArray(x) ? x[0] : x`
- **Floothink logo**: Sidebar references `/floothink-logo.png`. File must exist in `public/` — if sidebar shows broken image, this file is missing.
- **Dark mode logo inversion**: `[data-theme='dark'] .sidebar-logo img { filter: brightness(0) invert(1) }` — auto-converts purple logo to white.
- **`content_topics.objective` column**: Was missing originally, needed `ALTER TABLE content_topics ADD COLUMN IF NOT EXISTS objective varchar(100)` — should already be applied.
- **Workspace brands not showing**: Brands created before workspace fix have `workspace_id = null`. Heal query in brands page must NOT filter by `created_by` or it blocks the heal.

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
