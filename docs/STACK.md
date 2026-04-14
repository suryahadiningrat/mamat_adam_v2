# Stack & Project Structure

## Tech Stack

| Layer | Tech | Notes |
|-------|------|-------|
| Framework | Next.js 14 (App Router) + TypeScript | |
| Styling | Tailwind CSS + CSS custom properties (globals.css) | |
| Icons | Lucide React | |
| Database | Local PostgreSQL (port 5432) | via ORM (e.g., Prisma or Drizzle) |
| Storage | Local File System / MinIO | Replaces Supabase Storage (`product_images`) |
| Auth | NextAuth.js (Auth.js) / Custom JWT | Replaces Supabase Auth |
| AI — Text | Anthropic Claude API / Local Gemma | Claude 3.5 Sonnet & Haiku / Local Gemma via Ollama |
| AI — Image | KIE.ai (Planned) | Async generation via `task_id` polling |
| AI — Vector | pgvector (Planned) | For semantic search in Brand IQ Phase 2 |
| Scraping | Jina Reader (r.jina.ai) | Markdown conversion |
| Hosting | Vercel | |

---

## Environment Variables

```env
# .env.local

# Database
DATABASE_URL="postgresql://suryahadiningrat:@localhost:5432/fce_db?schema=public"

# Auth (NextAuth.js)
NEXTAUTH_SECRET="your-super-secret-jwt-key"
NEXTAUTH_URL="http://localhost:3000"

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
    └── lib/
        ├── db.ts                 # Local Postgres client (e.g., Prisma Client)
        ├── auth.ts               # NextAuth / Session configuration
        └── skills/               # Marketing AI skills (copywriting, etc.)
├── docs/                         # This folder
└── schema.sql                    # Initial DB schema (Postgres native)
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
