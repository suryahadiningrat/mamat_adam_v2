# Stack & Project Structure

## Tech Stack

| Layer | Tech | Notes |
|-------|------|-------|
| Framework | Next.js 14 (App Router) + TypeScript | |
| Styling | Tailwind CSS + CSS custom properties (globals.css) | |
| Icons | Lucide React | |
| Database | Supabase (PostgreSQL) | |
| Storage | Supabase Storage | `product_images` bucket |
| Auth | Supabase Auth | email + password |
| AI — Text | Anthropic Claude API / Local Gemma | Claude 3.5 Sonnet & Haiku / Local Gemma via Ollama |
| Scraping | Jina Reader (r.jina.ai) | Markdown conversion |
| Hosting | Vercel | |

---

## Environment Variables

```env
# .env.local

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Anthropic (server-side only, never expose to client)
ANTHROPIC_API_KEY=

# Local AI Engine (Gemma)
LOCAL_AI_BASE_URL=http://localhost:11434/v1
LOCAL_AI_MODEL_NAME=gemma2:9b
```

> ⚠️ \`ANTHROPIC_API_KEY\` must NEVER appear in client-side code or \`NEXT_PUBLIC_\` variables.

---

## Folder Structure

```
/
├── src/
│   ├── app/
│   │   ├── (dashboard)/          # Authenticated routes
│   │   │   ├── layout.tsx        # Auth guard, workspace init, sidebar
│   │   │   ├── page.tsx          # Home / Dashboard
│   │   │   ├── generate/         # Single post generation
│   │   │   ├── topics/           # Bulk topic calendar
│   │   │   ├── topic-library/    # Saved topics
│   │   │   ├── campaigns/        # Campaign strategy
│   │   │   ├── brands/           # Brand Brain
│   │   │   ├── products/         # Product Brain
│   │   │   ├── library/          # Content library
│   │   │   ├── learning/         # Analytics
│   │   │   ├── settings/         # User + Workspace settings
│   │   │   ├── workspace-settings/ # Team + Billing
│   │   │   └── admin/            # Superadmin panel
│   │   ├── api/
│   │   │   ├── generate/         # Content generation (Claude Sonnet)
│   │   │   ├── generate-topics/  # Bulk topics (Claude Sonnet)
│   │   │   ├── generate-campaign/# Campaigns (Claude Sonnet)
│   │   │   ├── scrape-brand/     # Brand extraction (Jina + Claude Haiku)
│   │   │   └── scrape-product/   # Product extraction (Jina + Claude Haiku)
│   │   ├── login/                # Auth page
│   │   └── layout.tsx            # Root layout
│   ├── contexts/
│   │   └── WorkspaceContext.tsx  # Workspace state management
│   └── lib/
│       ├── supabase.ts           # Supabase client config
│       └── skills/               # Marketing AI skills (copywriting, etc.)
├── docs/                         # This folder
└── supabase-schema.sql           # Full DB schema
```

---

## API Routes — Quick Reference

| Method | Route | Purpose | AI Model |
|--------|-------|---------|----------|
| POST | `/api/generate` | Single post/carousel/video generation | Claude Sonnet 4 / Gemma |
| POST | `/api/generate-topics` | Bulk topic calendar generation | Claude Sonnet 4 / Gemma |
| POST | `/api/generate-campaign` | Campaign strategy generation | Claude Sonnet 4 / Gemma |
| POST | `/api/scrape-brand` | Extract brand info from URLs | Claude Haiku 4.5 / Gemma |
| POST | `/api/scrape-product` | Extract product info from URLs | Claude Haiku 4.5 / Gemma |
