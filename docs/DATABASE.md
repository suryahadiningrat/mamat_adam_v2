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
