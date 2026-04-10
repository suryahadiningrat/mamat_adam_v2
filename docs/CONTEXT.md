# Project: FCE Dashboard (Floothink Content Engine)

## What This Is
Internal/SaaS web application for marketing teams to auto-generate social media content using AI. Users define "Brand Brain" and "Product Brain", which the AI uses to generate highly contextualized single posts, carousels, videos, bulk topic calendars, and campaign strategies.

## Core Concepts

### Workspace
All data is workspace-scoped. Every brand, product, generation, and campaign belongs to one workspace.

### Roles
- **Admin** — manages workspace settings, billing, team invites, and has full access to content.
- **Editor** — creates and edits content, brands, and products.
- **Viewer** — read-only access.
- **Superadmin** — manages all workspaces (internal team).

### Brand Brain
Each brand has its own identity: name, summary, tone of voice, personality, target audience, values, USP, content pillars, marketing strategy, and do's/don'ts.

### Product Brain
Each product has its own context: name, type, USP, RTB (Reason to Believe), functional/emotional benefits, target audience, price tier.

### AI Scraping
Users can paste URLs (website, social media) and the system will use Jina Reader + Claude Haiku to extract and populate Brand/Product Brain fields automatically.

### Generation & Prompts
Content generation saat ini menggunakan Anthropic Claude Sonnet 4 dengan prompt caching. *The Brand and Product contexts* dikirim sebagai *ephemeral cached blocks* untuk menghemat token pada *repeat generations*.
> **Penting (Mendatang):** Ada rencana migrasi ke model **Local AI (Gemma)** via Ollama untuk menggantikan ketergantungan pada API Anthropic guna memangkas biaya API.

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
