# Project Checklist — FCE Dashboard

> Track development progress and feature completion. 
> Referensi ini digunakan oleh AI Agent untuk memahami fitur secara detail sebelum menambahkan sub-fitur.

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
- [ ] Sediakan UI State: "Generating...", *skeleton loader*, hingga gambar diunduh dan dipindah ke Supabase Storage.

## Phase 11 — Feedback Loop & Advanced Grounding 🚧 BACKLOG
**Tujuan:** Mewujudkan *Continuous Improvement Loop* dan penarikan konteks lanjutan (Phase 2 PRD).
- [ ] Buat UI untuk memberi *rating* atau *reason tags* pada setiap *output* (tersimpan di `output_feedback_events`).
- [ ] Implementasi ekstensi `pgvector` di PostgreSQL/Supabase.
- [ ] Refaktor mesin *generation* untuk mengambil *chunks* referensi dokumen secara dinamis menggunakan *vector similarity search* ketika *Brand IQ* terlalu besar.
