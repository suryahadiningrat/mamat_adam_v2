# Project: FCE Dashboard (Floothink Content Engine)

## What This Is
Internal/SaaS web application for marketing teams to auto-generate social media content using AI. Users define "Brand Brain" and "Product Brain", which the AI uses to generate highly contextualized single posts, carousels, videos, bulk topic calendars, and campaign strategies.

## Core Concepts

### Workspace (Project)
All data is workspace-scoped (referred to as Projects per client/brand). Every brand, product, generation, and campaign belongs to one workspace.

### Roles & Collaboration Model
Selain role sistem dasar (Admin, Editor, Viewer, Superadmin), aplikasi dirancang untuk mendukung alur kerja tim agensi:
- **Admin (CEO / Ops Lead)** — mengelola workspace, billing, pengaturan AI *default*, dan anggota tim.
- **Account** — mengelola persetujuan (*approval*) klien, serta akses pembagian ekspor konten.
- **Strategist** — merancang *campaign*, merencanakan kalender konten, membuat ide topik, dan menugaskan draf.
- **Content (Copywriter)** — menulis/mengedit draf, dan mengubah topik menjadi *copy* atau skrip video yang siap tayang.
- **Production (Designer/Video)** — menerima *production briefs* (termasuk *image prompts* AI) dan mengunggah *assets*.
- **Data/Analyst** — mencatat metrik performa (*insights*) ke dalam sistem untuk bahan pembelajaran (*feedback loop*).

### Brand Brain & Product Brain (Brand IQ)
Each brand has its own identity: name, summary, tone of voice, personality, target audience, values, USP, content pillars, marketing strategy, and do's/don'ts.

### Product Brain
Each product has its own context: name, type, USP, RTB (Reason to Believe), functional/emotional benefits, target audience, price tier.

### AI Scraping
Users can paste URLs (website, social media) and the system will use Jina Reader + Claude Haiku to extract and populate Brand/Product Brain fields automatically.

### Generation & Grounding (AI Pipeline)
Sistem memiliki 3 langkah utama (*core loop*):
1. **Calendar:** Merencanakan jadwal publikasi, *channel*, dan objektif di tampilan kalender visual (*month/week grid*).
2. **Topics:** *Drawer* AI (*Guided choice*) yang mengusulkan topik dari referensi Campaign/Brand. Pengguna memilih satu untuk dikembangkan.
3. **Content Editor:** Ruang kerja berbasis *block-editor* (Hook, Problem, Value, CTA, Production Notes). Di sini, AI bisa me-*regenerate* blok secara terpisah.

*Grounding* dilakukan melalui **Prompt Caching** (fase MVP) menggunakan Anthropic Claude Sonnet 4 atau Local Gemma, dengan menyuntikkan seluruh *Brand/Product IQ* ke *system prompt*. Pada Fase lanjutan, *semantic search* menggunakan `pgvector` akan diimplementasikan.

### Image Generation (Async)
FCE juga mendukung pembuatan draf visual (*production briefs*) menggunakan **KIE.ai**. Pengguna membuat permintaan (mengembalikan `task_id`), lalu sistem melakukan *polling* secara asinkron (*background*) sampai gambar selesai dan disimpan ke Storage.

---

## Core Rules (Non-Negotiable)
1. All data access must enforce Workspace RLS.
2. AI prompts must include the relevant Brand Brain and Product Brain context.
3. Content generation uses Claude Sonnet 4 with Prompt Caching (Brand/Product info cached).
4. Scraping uses Jina Reader (`r.jina.ai`) to bypass bot blocks and extract clean markdown.
5. All generated content must be saved to `generation_outputs` and requests to `generation_requests`.
6. UI language is English, but content generation defaults to Indonesian (unless specified otherwise).

---

## Key User Flows

### Generate Content
Select Brand & Product → Select Platform & Format → Select Objective, Framework, Hook, Tone → Generate → AI outputs structured JSON (copy, visual direction, slides/scenes) → Output displayed and saved to library.

### Bulk Topic Generation
Select Brand & Product → Select Platform & Date Range → Generate → AI outputs 5-30 topic ideas → Save to Topic Library.

### Campaign Strategy
Select Brand & Product → Define Objective, Audience, Flight Dates, Budget, Channel Mix → Generate → AI outputs Big Idea, Message Pillars, Funnel Journey, Deliverables.
