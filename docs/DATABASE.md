# Database Schema

## Overview

All core tables reside in a local PostgreSQL database (accessed via Prisma, Drizzle, or raw `pg` client).

> **MIGRATION NOTE (No Supabase):** 
> Karena kita berpindah dari Supabase ke Local PostgreSQL mentah, **Row Level Security (RLS)** bawaan Supabase yang menggunakan `auth.uid()` tidak lagi berfungsi secara *native*.
> Isolasi data (Tenant Isolation) kini harus diimplementasikan pada **Level Aplikasi (Application-Level Security)**. Artinya, di setiap rute API atau Server Action, kita harus memvalidasi *session/token* pengguna, mencari `workspace_id` yang ia miliki di `user_workspace_roles`, dan secara manual menambahkan klausa `WHERE workspace_id IN (...)` di setiap kueri database.

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
| `campaigns` | Campaign strategy entities |
| `campaign_outputs` | Generated campaign strategy briefs |
| `output_feedback_events` | Logs for user edits/ratings to create a feedback loop |
| `calendar_items` | *(Planned)* Visual calendar grid metadata and scheduling |
| `drafts` | *(Planned)* Modular text blocks for per-block AI regeneration |
| `assets` | *(Planned)* Media (image/video) tracking with metadata |
| `competitor_accounts` | *(Phase 12)* Daftar akun kompetitor per workspace/brand |
| `competitor_videos` | *(Phase 12)* Cache hasil scraping video viral kompetitor |
| `viral_analyses` | *(Phase 12)* Hasil analisis Gemini: Hook, Retensi, CTA, formula tags |
| `viral_concepts` | *(Phase 12)* Konsep konten baru hasil adaptasi formula ke brand |

---

## Key Tenant Isolation Pattern (Application Layer)

Karena tidak ada Supabase RLS, setiap operasi *read/write* di ORM (misal Prisma) **harus** difilter:

```typescript
// Contoh implementasi di Next.js (Prisma)
const session = await auth() // Ambil dari NextAuth
if (!session) throw new Error("Unauthorized")

// Selalu cari berdasarkan workspace yang user berhak akses
const userWorkspaces = await prisma.userWorkspaceRole.findMany({
  where: { userId: session.user.id },
  select: { workspaceId: true }
})
const allowedWorkspaceIds = userWorkspaces.map(role => role.workspaceId)

const brands = await prisma.brand.findMany({
  where: {
    workspaceId: { in: allowedWorkspaceIds }
  }
})
```

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

## Local Storage Bucket (Replaces Supabase Storage)

Karena tidak menggunakan Supabase Storage, kita menggunakan Local File System (di bawah direktori `public/uploads`) atau Object Storage terpisah seperti **MinIO** atau S3 untuk menyimpan:
- `product_images`: Thumbnail produk dan logo workspace
- `assets`: Konten media dari AI (video/gambar)

## Custom Database Functions (Stored Procedures)

Fungsi `increment_api_usage` yang dulunya ada di Supabase RPC (Remote Procedure Call) kini bisa diimplementasikan sebagai transaksi Prisma (`prisma.$executeRaw`) atau via kueri *pg* native di rute API.

---

## Phase 12 Schema — Competitor Intelligence Tables

Buat via file `migrate_competitor_intelligence.sql`. Jalankan dengan `prisma db execute` atau paste ke psql local.

```sql
-- Akun kompetitor yang dipantau per workspace/brand
CREATE TABLE competitor_accounts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  brand_id      UUID REFERENCES brands(id) ON DELETE SET NULL,
  platform      VARCHAR(50) NOT NULL,         -- 'TikTok' | 'Instagram' | 'YouTube'
  username      VARCHAR(255) NOT NULL,
  profile_url   TEXT,
  niche_tags    TEXT[],                        -- misal: ['otomotif','lifestyle','edukasi']
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Cache video viral hasil scraping Apify
CREATE TABLE competitor_videos (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_account_id UUID NOT NULL REFERENCES competitor_accounts(id) ON DELETE CASCADE,
  video_url             TEXT NOT NULL,
  video_id_platform     VARCHAR(255),          -- ID native dari platform (TikTok video ID, dll)
  title                 TEXT,
  views                 BIGINT DEFAULT 0,
  likes                 BIGINT DEFAULT 0,
  comments              BIGINT DEFAULT 0,
  shares                BIGINT DEFAULT 0,
  posted_at             TIMESTAMPTZ,
  scraped_at            TIMESTAMPTZ DEFAULT NOW(),
  raw_metadata          JSONB                  -- Raw response dari Apify (simpan semua field)
);

-- Hasil analisis Gemini: bedah anatomi video viral
CREATE TABLE viral_analyses (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_video_id  UUID NOT NULL REFERENCES competitor_videos(id) ON DELETE CASCADE,
  workspace_id         UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  hook_analysis        TEXT,                   -- Bagaimana 3 detik pertama menarik perhatian
  retention_strategy   TEXT,                   -- Teknik mempertahankan penonton
  cta_analysis         TEXT,                   -- Cara mengajak aksi di akhir
  why_viral            TEXT,                   -- Summary mengapa video ini berhasil
  comment_insights     TEXT,                   -- (Opsional) Sentimen komentar audiens
  formula_tags         TEXT[],                 -- misal: ['curiosity-hook','transformation','list-format']
  analyzed_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Konsep konten baru hasil adaptasi formula ke Brand
CREATE TABLE viral_concepts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viral_analysis_id UUID NOT NULL REFERENCES viral_analyses(id) ON DELETE CASCADE,
  brand_id          UUID REFERENCES brands(id) ON DELETE SET NULL,
  product_id        UUID REFERENCES products(id) ON DELETE SET NULL,
  platform          VARCHAR(50),
  content_title     TEXT,
  hook_adaptation   TEXT,                      -- Versi hook yang sudah diadaptasi ke brand
  script_concept    TEXT,                      -- Outline skrip / konsep narasi
  visual_direction  TEXT,                      -- Arahan visual / produksi
  production_notes  TEXT,                      -- Catatan khusus sesuai production_constraints brand
  status            VARCHAR(20) DEFAULT 'draft', -- 'draft' | 'saved' | 'used'
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk performa query
CREATE INDEX idx_competitor_accounts_workspace ON competitor_accounts(workspace_id);
CREATE INDEX idx_competitor_videos_account ON competitor_videos(competitor_account_id);
CREATE INDEX idx_viral_analyses_workspace ON viral_analyses(workspace_id);
CREATE INDEX idx_viral_concepts_brand ON viral_concepts(brand_id);
```

### Tenant Isolation untuk Phase 12

Semua query ke tabel-tabel ini **harus** difilter via `workspace_id` menggunakan pola yang sama seperti tabel lainnya (lihat bagian "Key Tenant Isolation Pattern" di atas).

```typescript
// Contoh: fetch competitor accounts untuk workspace aktif
const accounts = await prisma.competitorAccount.findMany({
  where: { workspaceId: { in: allowedWorkspaceIds } },
  include: { competitorVideos: { orderBy: { views: 'desc' }, take: 10 } }
})
```