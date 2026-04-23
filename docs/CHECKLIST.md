# Project Checklist — FCE Dashboard

> Track development progress and feature completion. 
> Referensi ini digunakan oleh AI Agent untuk memahami fitur secara detail sebelum menambahkan sub-fitur.

### Phase 0.5: Full Migration to PostgreSQL & Prisma (No Supabase) ⏳
- [x] Uninstall `@supabase/supabase-js` & remove `src/lib/supabase.ts`
- [x] Setup NextAuth.js (Credentials provider) dan `src/lib/auth.ts`
- [x] Refactor existing Pages (Brands, Workspace, Auth) to use Prisma APIs
- [x] Refactor remaining pages (Products, Campaigns, Topics, Settings) to use Prisma APIs
- [x] Setup local storage logic (via Next.js API route `fs` or `minio`) untuk `product_images`
- [x] Test end-to-end user flow (Signup -> Create Workspace -> Create Brand -> Generate Content)

---

## Phase 1 — Foundation & Auth
**Tujuan:** Membangun fondasi aplikasi, routing, dan sistem autentikasi multi-tenant.
- [x] Inisialisasi Next.js 14 App Router dengan TypeScript.
- [x] Konfigurasi Tailwind CSS & global CSS custom properties (`globals.css`).
- [x] Integrasi Supabase Auth (Email & Password).
- [x] Setup UI Shell: Sidebar navigation, Header, dan Layout Dashboard.
- [x] Pembuatan tabel dasar: `workspaces`, `user_profiles`, `user_workspace_roles`.
- [x] Implementasi RLS (Row Level Security) untuk isolasi data antar workspace.
- [x] Pembuatan `WorkspaceContext` provider untuk mengelola state workspace aktif di seluruh halaman.
- [x] Halaman Login & Register dengan penanganan error.

## Phase 2 — Core Brains (Brand & Product)
**Tujuan:** Modul manajemen identitas Brand dan konteks Produk sebagai basis *prompting* AI.
- [x] **Brand Brain UI:** Halaman daftar Brand (`/brands`) dengan fungsionalitas CRUD.
- [x] **Product Brain UI:** Halaman daftar Product (`/products`) yang dikelompokkan berdasarkan Brand.
- [x] **Versioning System:** Implementasi tabel `brand_brain_versions` dan `product_brain_versions` untuk melacak perubahan parameter instruksi.
- [x] **AI Scraping Integration:** 
  - API endpoint `/api/scrape-brand` & `/api/scrape-product`.
  - Integrasi dengan Jina Reader (`r.jina.ai`) untuk konversi URL ke Markdown.
  - Integrasi dengan Claude Haiku 4.5 untuk ekstraksi data terstruktur.
- [x] **Auto-fill Forms:** Mekanisme pengisian otomatis form Brand/Product dari hasil scraping.
- [x] **Storage:** Upload dan manajemen gambar produk ke Supabase Storage (`product_images` bucket).

## Phase 3 — Generation Engine (Single Post)
**Tujuan:** Mesin utama untuk memproduksi satu konten (Single Image, Carousel, atau Video/Reel).
- [x] Integrasi pustaka *Marketing Skills* (`src/lib/skills/index.ts`) ke dalam sistem prompt.
- [x] **API Route `/api/generate`:** Menghubungkan input user dengan Anthropic Claude Sonnet 4.
- [x] **Dynamic Prompting:** Menggabungkan konteks dari Brand Brain dan Product Brain secara dinamis.
- [x] **Prompt Caching:** Implementasi caching pada blok Brand/Product untuk menghemat token cost.
- [x] **Output Schemas:** Menangani struktur JSON yang berbeda untuk Single Image, Carousel (slides), dan Video (scenes).
- [x] **Generation UI:** 
  - Form input dengan *advanced settings* (Objective, Framework, Hook Type, Tone).
  - Tampilan hasil *generation* (Visual Copy, Caption, Hashtags, CTA).
- [x] **Usage Tracking:** Implementasi *RPC function* `increment_api_usage` untuk melacak biaya token per workspace.
- [x] Penyimpanan *request* dan *output* ke tabel `generation_requests` dan `generation_outputs`.

## Phase 4 — Bulk Generation & Campaign Strategy
**Tujuan:** Fitur lanjutan untuk merencanakan kalender konten dan strategi campaign.
- [x] **Bulk Topic Generator UI:** Halaman `/topics` untuk memproduksi ide kalender konten.
- [x] **API Route `/api/generate-topics`:** Memproses request ke Claude Sonnet untuk menghasilkan 5-30 ide topik.
- [x] **Topic Library:** Halaman `/topic-library` untuk menyimpan, mengedit, dan mengubah status topik yang dihasilkan.
- [x] **Campaign Strategy Builder UI:** Halaman `/campaigns` untuk mengisi *brief* campaign (Objective, Audience, Budget, Channel Mix).
- [x] **API Route `/api/generate-campaign`:** Menghasilkan output strategi (Big Idea, Message Pillars, Funnel Journey, Deliverables).
- [x] Penyimpanan hasil ke tabel `content_topics`, `campaigns`, dan `campaign_outputs`.

## Phase 5 — Management & Settings
**Tujuan:** Pengelolaan konten yang sudah jadi dan administrasi workspace.
- [x] **Content Library:** Halaman `/library` untuk melihat, memfilter, dan me-*review* semua aset konten (Approve/Reject).
- [x] **Dashboard Home:** Menampilkan KPI (total generasi, approval rate), *recent activity*, dan rekomendasi AI.
- [x] **Learning/Analytics:** Halaman analitik untuk melihat performa persetujuan (approval rate) per platform/objective.
- [x] **Workspace Settings:** Manajemen profil workspace, batasan billing API, dan daftar anggota tim (Role: Admin, Editor, Viewer).
- [x] **Team Invites:** Fungsionalitas undang anggota tim via email (tabel `workspace_invitations`).
- [x] **User Profile Settings:** Pengaturan nama dan avatar pengguna.
- [x] **Superadmin Panel:** Halaman khusus (jika `is_superadmin=true`) untuk melihat semua workspace.

## Phase 6 — Polish & QA
**Tujuan:** Pembersihan bug, UX improvements, dan dokumentasi final.
- [x] Penanganan error yang robust untuk API limits (jika melewati `$20`) dan kegagalan generasi JSON.
- [x] Implementasi *Loading States* (spinner) dan Skeletons di seluruh halaman.
- [x] *Responsive design* untuk penggunaan di tablet dan mobile (meski diutamakan desktop).
- [x] Finalisasi semua file dokumentasi Markdown (`CONTEXT.md`, `STACK.md`, `DATABASE.md`, `PROMPTS.md`, `CHECKLIST.md`).

---

## Phase 7 — Local AI Model Migration (Gemma) 🚧 NEXT PHASE
**Tujuan:** Mengganti atau menambahkan opsi penggunaan model LLM lokal (Gemma) yang di-host di server lokal terpisah untuk menghindari biaya API Anthropic. Aplikasi web ini hanya akan memanggil API via IP lokal, tanpa ada instalasi model di mesin web server ini.
- [x] **Network & API Setup:** Pastikan server lokal AI (misal via Ollama/vLLM) sudah dapat diakses dari mesin web server ini melalui IP lokal (contoh: `http://192.168.x.x:11434/v1`).
- [x] **Update Environment Variables:** Tambahkan variabel environment untuk koneksi ke server AI, seperti `LOCAL_AI_BASE_URL` (IP dan port server AI lokal) dan `LOCAL_AI_MODEL_NAME`.
- [x] **AI Provider Abstraction:** Buat layer abstraksi di `/src/lib/ai/` agar sistem bisa *switch* antara Anthropic API dan Local Model (Gemma via OpenAI-compatible endpoint) berdasarkan konfigurasi *workspace* atau env.
- [x] **Prompt Tuning untuk Gemma:** Sesuaikan *System Prompt* dan instruksi *Output Schema* di `/api/generate`, `/api/generate-topics`, dan `/api/generate-campaign`. Karena Gemma mungkin merespons instruksi JSON sedikit berbeda dari Claude Sonnet, lakukan penyesuaian agar output JSON selalu valid.
- [x] **Scraping Fallback:** Sesuaikan endpoint `/api/scrape-brand` agar Gemma mampu mengekstrak JSON dengan stabil dari hasil Jina Reader jika menggantikan peran `Claude Haiku`.
- [x] **Performance & Context Testing:** Evaluasi *latency* (waktu respons via jaringan lokal), batas token *context window* server lokal (karena Brand Brain memakan banyak token), dan konsistensi struktur JSON.
- [ ] **UI Update:** (Opsional) Tambahkan opsi "AI Engine: Cloud / Local Server" di halaman Workspace Settings.

---

## Phase 8 — Content Calendar & Pipeline (Visual Planner)
**Tujuan:** Mengubah *dashboard* menjadi "Command Center" visual (*month/week grid*) yang menghubungkan Kampanye, Topik, dan Draf (mengacu pada PRD).
- [x] Buat tabel `calendar_items` (tanggal tayang, *channel*, status, `owner_id`, `campaign_id`).
- [x] Buat UI Calendar (Month & Week view).
- [x] Integrasikan fungsionalitas klik pada kalender untuk membuka *drawer/side panel* detail konten (Assignee, Status, dll).

## Phase 9 — Modular Content Editor (Block-based) 🚧 BACKLOG
**Tujuan:** Mengubah editor draf tunggal (*single JSON text*) menjadi editor modular berdasarkan struktur PRD (Hook, Body, Notes).
- [ ] Rancang UI editor yang memisahkan konten ke dalam blok-blok.
- [ ] Integrasikan fitur AI "Regenerate this block" atau "Make it shorter/funnier" khusus untuk satu blok tanpa merusak keseluruhan draf.
- [ ] Implementasi tabel/relasi `drafts` yang mendukung pelacakan versi.

## Phase 10 — Image Generation (Async) 🚧 BACKLOG
**Tujuan:** Mendukung draf visual menggunakan AI gambar (*KIE.ai* atau serupa).
- [ ] Buat API Endpoint untuk men-*trigger* `task_id` pembuatan gambar secara asinkron.
- [ ] Buat API/Cron/Client-polling untuk mengecek status `task_id`.
- [ ] Sediakan UI State: "Generating...", *skeleton loader*, hingga gambar diunduh dan dipindah ke Local Storage (misal: `/public/uploads` atau MinIO).

## Phase 11 — Feedback Loop & Advanced Grounding 🚧 BACKLOG
**Tujuan:** Mewujudkan *Continuous Improvement Loop* dan penarikan konteks lanjutan (Phase 2 PRD).
- [ ] Buat UI untuk memberi *rating* atau *reason tags* pada setiap *output* (tersimpan di `output_feedback_events`).
- [ ] Implementasi ekstensi `pgvector` di server PostgreSQL lokal.
- [ ] Refaktor mesin *generation* untuk mengambil *chunks* referensi dokumen secara dinamis menggunakan *vector similarity search* ketika *Brand IQ* terlalu besar.

---

## Phase 12 — Competitor Intelligence & Viral Formula Engine 🚧 NEXT PRIORITY
**Tujuan:** Membangun sistem intelijen kompetitor otomatis yang membedah video viral dari akun-akun kompetitor, mengekstrak formula (Hook/Retensi/CTA), lalu mengadaptasinya menjadi konsep konten baru yang sudah disesuaikan dengan Brand Brain pengguna.

**Arsitektur pipeline:** `Apify (scraping) → Gemini (video analysis multimodal) → Claude Sonnet (brand-adapted concept generation)`

### Sub-fase 12A — Database & Backend Foundation
- [ ] **Tabel `competitor_accounts`**: Daftar akun kompetitor per workspace. Kolom: `id`, `workspace_id`, `brand_id`, `platform` (TikTok/Instagram/YouTube), `username`, `profile_url`, `niche_tags` (array), `is_active`, `created_at`.
- [ ] **Tabel `competitor_videos`**: Cache hasil scraping video kompetitor. Kolom: `id`, `competitor_account_id`, `video_url`, `video_id_platform`, `title`, `views`, `likes`, `comments`, `shares`, `posted_at`, `scraped_at`, `raw_metadata` (JSONB).
- [ ] **Tabel `viral_analyses`**: Hasil analisis AI per video. Kolom: `id`, `competitor_video_id`, `workspace_id`, `hook_analysis` (text), `retention_strategy` (text), `cta_analysis` (text), `why_viral` (text), `formula_tags` (text array — misal: `["curiosity-hook","transformation","list-format"]`), `analyzed_at`.
- [ ] **Tabel `viral_concepts`**: Ide konten baru hasil adaptasi formula. Kolom: `id`, `viral_analysis_id`, `brand_id`, `product_id`, `platform`, `content_title`, `hook_adaptation`, `script_concept`, `visual_direction`, `production_notes`, `status` (`draft`/`saved`/`used`), `created_at`.
- [ ] Buat file SQL migration: `migrate_competitor_intelligence.sql` di root project. Jalankan via Prisma migrate atau paste ke SQL editor lokal.

### Sub-fase 12B — API Routes (Backend Logic)
- [ ] **`POST /api/competitor/add-account`**: Simpan akun kompetitor baru ke `competitor_accounts`. Validasi `workspace_id` dari session.
- [ ] **`POST /api/competitor/scrape`**: Panggil Apify API untuk scraping top-N video (default: 3) dalam X hari terakhir (default: 30 hari) dari satu atau semua akun kompetitor aktif. Simpan ke `competitor_videos`.
  - Apify Actor: `clockworks/free-tiktok-scraper` (TikTok) atau `apidojo/instagram-scraper` (IG).
  - Apify berjalan async — gunakan polling `runId` sampai status `SUCCEEDED`, lalu fetch dataset.
  - Tambahkan `APIFY_API_KEY` ke `.env.local`.
- [ ] **`POST /api/competitor/analyze`**: Kirim URL video + metadata ke **Google Gemini API** (`gemini-2.0-flash`) untuk analisis video multimodal. Gemini membedah Hook, Retensi, dan CTA. Simpan hasil ke `viral_analyses`.
  - Tambahkan `GEMINI_API_KEY` ke `.env.local`.
  - Gunakan Gemini karena Claude saat ini tidak bisa menonton/menganalisis video secara langsung.
  - Lihat format prompt di `PROMPTS.md` section "Competitor Video Analysis Prompt".
- [ ] **`POST /api/competitor/generate-concepts`**: Kirim `viral_analyses` + Brand Brain ke **Claude Sonnet** untuk generate 3-5 konsep video baru yang diadaptasi ke brand. Simpan ke `viral_concepts`.
  - Inject Brand Brain context penuh: tone, dos/donts, content_pillars, production_constraints.
  - `production_constraints` harus diisi user di Brand Brain agar Claude tidak generate ide yang mustahil diproduksi (misal: "solo creator, indoor, no budget for props").

### Sub-fase 12C — UI Pages & Components
- [ ] **Halaman `/competitor-intel`**: Tambahkan ke sidebar navigation.
  - Panel kiri: Daftar akun kompetitor dikelompokkan per brand. Tombol "Add Account" dan "Scrape All Now".
  - Panel kanan: Feed video viral hasil scraping. Tiap card: thumbnail, views, tanggal, status analisis (belum/sedang/selesai).
  - Tab: "Viral Concepts" — daftar semua konsep yang sudah digenerate dari workspace ini.
- [ ] **Modal "Add Competitor Account"**: Input platform (dropdown), username/URL, niche tags. Tombol Save → POST `/api/competitor/add-account`.
- [ ] **Video Card dengan Analysis Expand**: Tombol "Analyze" per video → trigger `/api/competitor/analyze`. Setelah selesai, tampilkan expandable section: Hook Analysis, Retention Strategy, CTA Analysis, Formula Tags.
- [ ] **Tombol "Generate Concepts"**: Muncul setelah analisis selesai. Selector brand/product → POST `/api/competitor/generate-concepts`. Tampilkan 3-5 concept cards.
- [ ] **Concept Card**: Tampilkan `content_title`, `hook_adaptation`, `script_concept`, `visual_direction`, `production_notes`. Dua tombol aksi:
  - "Save to Topics" → POST ke `content_topics`, masuk pipeline kalender.
  - "Generate Full Content" → redirect ke `/generate` dengan konsep ini sebagai pre-fill.
- [ ] **Production Constraints Field di Brand Brain** (`/brands`): Tambahkan textarea `production_constraints` di form Brand Brain. Disimpan ke `messaging_rules.production_constraints`. Ini wajib ada agar konsep yang dihasilkan Claude realistis untuk tim.

### Sub-fase 12D — Automation (V2 / Optional)
- [ ] **Scheduled Scraping**: Cron job (Vercel Cron atau `node-cron`) yang auto-scrape semua akun kompetitor aktif setiap minggu. Flag video baru vs sudah dianalisis.
- [ ] **Comment Sentiment Analysis**: Tambahkan tombol "Analyze Comments" per video. Kirim sample komentar ke Claude Haiku untuk ekstrak sentimen (pain points, pertanyaan, reaksi dominan audiens). Simpan sebagai field `comment_insights` di `viral_analyses`.
- [ ] **Self-Account Analysis Mode**: Input akun sendiri → bedah video mana yang viral vs gagal → ekstrak pola performa historis.
- [ ] **Viral Alert**: Jika scraping menemukan video baru dengan views > threshold (configurable per workspace), tampilkan notifikasi in-app "New Viral Detected from [username]".

### File Lain yang Harus Diupdate Saat Implementasi Phase 12
- [ ] `STACK.md` — Tambahkan `Apify API` dan `Google Gemini API` ke tabel Tech Stack + env vars.
- [ ] `PROMPTS.md` — Tambahkan 2 section baru: "Competitor Video Analysis Prompt (Gemini)" dan "Viral Concept Adaptation Prompt (Claude)".
- [ ] `ARCHITECTURE.md` — Tambahkan diagram alur Competitor Intelligence Pipeline.
- [ ] `DATABASE.md` — Tambahkan 4 tabel baru ke tabel ringkasan schema.