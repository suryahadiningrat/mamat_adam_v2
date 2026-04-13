# PRD for a Simple AI Content Calendar Web App

## Product vision and success definition

This web app is an internal “content operations hub” for a digital marketing agency: one place where the team stores per-client Brand Knowledge and Product Knowledge (Brand IQ) and then uses AI to produce a **content calendar → topic ideas → ready-to-edit drafts** flow that stays consistent with each project’s context. The design goal is to reduce the chaos and inconsistency that happens when calendars, briefs, brand guidelines, and drafts live across many spreadsheets and documents—while still keeping humans in control for approvals and final edits. The core UX is intentionally simpler than enterprise marketing copilots, but it borrows proven patterns: brand voice + knowledge base grounding, calendar-first planning, collaboration, and approvals. citeturn0search3turn0search15turn2search0turn2search2

A content calendar (or editorial calendar / marketing calendar) is commonly treated as the “single source of truth” that connects campaigns, tasks, deadlines, and publishing cadence across a team—so a calendar-first design is aligned with how modern marketing teams coordinate work. citeturn2search0turn2search9turn2search18

**North Star user outcome (weekly):**  
A Strategist opens a Project, clicks “Generate Calendar,” selects the best topics, and produces drafts plus production briefs that are already aligned to brand voice, product facts, and campaign goals—then the Account and Content teams can review/approve quickly.

**Success metrics (MVP-friendly):**
- Time-to-first-calendar (from new project created → first usable calendar) decreases.
- % of AI drafts that require only “light edits” (self-reported quick rating after editing).
- Reduction in “brand compliance edits” (e.g., wrong product claim, wrong tone).
- Adoption: weekly active usage by Strategist + Content at minimum; Account as approver. (Editorial calendars are most valuable when people actually use them as the implementation plan.) citeturn2search0turn2search26

## Users, permissions, and collaboration model

Because your agency has multiple teams touching the same deliverables, the permission system should be **simple but explicit**. Collaboration tools that manage calendars at scale typically emphasize role-based permissions and governance/approval to protect the brand. citeturn2search2turn2search18

**Primary roles (MVP):**
- **Admin (CEO / Ops Lead):** creates workspace, manages billing, sets default AI settings, manages team members.
- **Account:** creates projects, manages client-facing approvals, controls what can be shared/exported.
- **Strategist:** owns campaign plan + content calendar; generates topics; assigns content pieces.
- **Content:** writes/edits drafts; turns topics into publishable copy/scripts.
- **Production (Designer/Video):** receives “production briefs,” image prompts, and uploads assets.
- **Data/Analyst:** logs performance notes/metrics and “learning insights” back into the project.

**Permission rules (keep it low-friction):**
- “Project-based access”: people only see projects they’re assigned to.
- “Brand IQ edit rights”: Strategist + Account can edit; Content can suggest edits; Data can add “insights.”  
- “Approval gate”: only Account (and optionally Strategist) can move status to **Approved**.

This approach mirrors the governance direction seen in mature calendar tools (permissions, audit trail) while keeping the implementation lightweight. citeturn2search2turn2search18

## Core workflow and information architecture

### The core loop

Your requested UX can be designed as a **3-step “pipeline”** with an always-visible progress state:

1) **Calendar** (what will we publish, when, where, and why?)  
2) **Topics** (angles/hooks that match campaign + audience + brand)  
3) **Content** (drafts + variants + production briefs)

This maps directly onto common best practice: plan on a centralized calendar, brainstorm topics, then execute production with roles and deadlines. citeturn2search0turn2search26turn2search18

### Information architecture

A simple left navigation keeps focus:

- **Projects** (list + create)
- **Project Home**
- **Brand IQ** (brand voice, products, claims, audience, do/don’t)
- **Campaign Planning** (brief + messaging matrix + channel plan)
- **Content Calendar** (month/week view, tasks, statuses)
- **Generator** (Topic → Content pipeline view; opens as drawers from Calendar)
- **Assets** (images, videos, brand files)
- **Insights** (performance notes; “what worked” library)
- **Settings** (team, model/provider keys, templates)

A “Project Home” acts as a hub: brand IQ completeness, campaign status, upcoming calendar items, and quick actions.

### UX patterns worth copying (without copying the complexity)

The inspiration platform you mentioned positions AI outputs as being grounded by: **brand voice, style guide, audiences, and a knowledge base**, and it applies that grounding to calendar and campaign planning agents. citeturn0search3turn0search23turn0search15  
That pattern is compatible with what you want, but your UX should expose it in a simpler way: one Brand IQ screen with a “Completeness meter” and a “Used in generation” summary.

image_group{"layout":"carousel","aspect_ratio":"16:9","query":["AI content calendar web app UI","social media content calendar approval workflow UI","content brief to post generator UI","marketing campaign planning dashboard UI"],"num_per_query":1}

## Key screens and interaction mockups

These are **low-fidelity wireframes** (text mockups) meant to be immediately actionable for a designer or a “vibe coding” build. They reflect the “Calendar → Topics → Content” pipeline as the main interaction model.

### Project creation and onboarding

**Design intent:** reduce setup friction but still force the minimum Brand IQ needed for decent outputs.

```text
[Create Project]  (Wizard: 3 minutes)

Step 1: Basics
- Project Name: ____________________
- Client/Brand: ____________________
- Default Language: [EN/ID/...]
- Timezone: [Asia/Jakarta]
- Channels: [ ] IG [ ] TikTok [ ] YouTube [ ] Blog [ ] Email [ ] Ads
[Next]

Step 2: Brand IQ Minimum
- Brand voice (3-5 adjectives): ____________
- Do / Don’t phrases:  ____________________
- Product facts (bullets):  ________________
- Key audience: ___________________________
[Upload brand guideline PDF]  [Skip for now]
[Next]

Step 3: Workflow
- Default cadence:  [3 posts/wk]
- Approval: Account must approve? [Yes]
- Content templates: [IG Reel] [Carousel] [Blog] [Ad Copy]
[Create Project]
```

Why this matters: editorial/calendar best practice often starts with aligning stakeholders, goals, and cadence, then brainstorming topics and measuring results—so the wizard should capture the minimum “alignment data” early. citeturn2search0turn2search26

### Brand IQ screen (the “context engine”)

**Design intent:** Brand IQ must be fast to maintain. If it feels like documentation work, people won’t keep it current.

```text
[Project: ACME Skincare]   Brand IQ   Completeness: ███████░  (70%)

Tabs: (Voice & Style) (Products) (Audience) (Claims & Compliance) (Reference Docs)

Voice & Style
- Tone sliders:  Formal ○───●───○ Casual   Witty ○──●──○ Serious
- Brand adjectives: [scientific] [friendly] [premium]
- Forbidden words: ______________________
- Example "good post": [Paste text]
- Example "bad post":  [Paste text]
[Save]

Products
- Product list:
  - Serum A: benefits, ingredients, price range, proof points
  - Cleanser B: ...
[Add product]  [Import CSV later]

Reference Docs
[Upload PDF] [Upload image] [Link notes]
- Brand guideline v3.pdf
- Messaging pillars.txt
```

This mirrors the proven “brand voice + knowledge base” concept used by established AI marketing tools, but in a single, editable page. citeturn0search15turn0search19turn0search3

### Content Calendar (command center)

**Design intent:** calendar is the default view. Everything else opens as a drawer/side panel so the user never loses context.

```text
[Content Calendar]  Month: April 2026     View: [Month | Week | List]
Filters: Channel [All]  Status [All]  Campaign [All]  Owner [All]

Calendar Grid
Mon   Tue   Wed   Thu   Fri   Sat   Sun
      [7] Topic: "..."
[14] IG Reel - Draft
[15] Carousel - Pending Review
[16] Blog - Approved
...

Right panel (when clicking a calendar item)
-----------------------------------------
Item: IG Reel (Apr 14)
Campaign: "Ramadan Promo"
Goal: Awareness
Audience: Gen Z skincare
Status: Draft   Owner: Content
Buttons: [Generate Topics] [Open Content Draft] [Request Approval]
-----------------------------------------

Top actions:
[+ Add Item]   [AI: Generate Calendar for this month]
```

Centralized calendars are widely described as a way to plan, track, and manage posts/tasks across the month and coordinate teams, especially when multiple contributors are involved. citeturn2search18turn2search2turn2search26

### Calendar → Generate topics (drawer interaction)

**Design intent:** topic generation is “guided choice,” not a chat box. Give 8–12 options, then the user selects and locks one.

```text
[Drawer: Generate Topics for IG Reel - Apr 14]

Inputs (auto-filled from Brand IQ + Campaign):
- Channel: IG Reel
- Objective: Awareness
- Audience: Gen Z skincare
- Product focus: Serum A
- Brand voice: scientific + friendly
- Constraints: No medical claims

Optional user input:
- Keyword / angle to include: ____________
- Competitor reference (optional): ________

[Generate 10 topics]   (AI)
Results:
1) "3 signs your skin barrier is struggling (and the quick fix)"
2) "Morning routine in 30 seconds: Serum A + ..."
3) "Myth-busting: ‘Oily skin doesn’t need hydration’"
...
Actions per topic: [Select] [Refine] [Generate variants]

Footer: Selected topic: _____________________  [Confirm & Continue]
```

This controlled “topic shortlist” approach supports the workflow recommended in editorial calendar processes: brainstorm, choose, plan flexibility, then execute. citeturn2search0turn2search26

### Topic → Generate content (editor with structured outputs)

**Design intent:** a document editor, not a chat. Show a structured template output by format (Reel script, Carousel slides, Blog outline, etc.).

```text
[Content Editor]   Item: IG Reel - Apr 14  Status: Draft

Left: Outline / Blocks
- Hook (0-2 sec)
- Problem
- Value / tips
- Soft CTA
- On-screen text
- Caption
- Hashtags
- Production notes (B-roll ideas)

Center: Editable text blocks
[Hook]
"Stop scrolling—your skin barrier might be begging for this."

[Production notes]
- Shot 1: close-up skincare shelf
- Shot 2: apply Serum A
- Text overlay: "Barrier ≠ dry skin only"

Right: AI Tools (buttons)
[Regenerate this block]
[Shorten] [Make more premium] [Add humor]
[Generate 3 caption variants]
[Generate image/video brief]
[Generate images] (optional)

Footer:
[Save Draft] [Send for Review] [Export: CSV / Copy]
```

### Campaign Planning (kept intentionally simple)

**Design intent:** create a campaign “source of truth” that feeds the calendar generator.

```text
[Campaign Planning]  Campaign: "Ramadan Promo"

Campaign Brief
- Objective: ___________________________
- Offer: _______________________________
- Target audience segments: _____________
- Key messages (3): _____________________
- Proof points / references: ____________
- Must include: _________________________
- Must avoid: ___________________________
[Save]

Messaging Matrix (simple)
- Audience x Pain Point x Message x CTA

Channel plan
- IG: 8 reels, 6 carousels
- TikTok: 6 videos
- Blog: 2 articles
[Generate Calendar from this plan]
```

Campaign planning tools commonly anchor calendars around campaigns/tasks/events and then translate them into scheduled work, which is why this module should exist even if minimal. citeturn2search1turn2search9

## Brand IQ knowledge design and AI generation logic

### What “Brand IQ” should contain (MVP)

Brand IQ must be structured enough that the AI can reliably follow it. The minimum recommended fields are:

- **Voice & style:** tone, vocabulary rules, formatting rules, example “good/bad” content.
- **Product knowledge:** product catalog, features/benefits, ingredients, pricing claims, allowed proof points.
- **Audience:** segments, pains, desired outcomes, regional language notes.
- **Compliance guardrails:** forbidden claims, required disclaimers, sensitive topics.
- **Reference docs:** uploads (guidelines, past campaigns).

This mirrors the “brand voice + style guide + knowledge base” pattern that AI marketing platforms use to keep outputs consistent, but implemented as your own lightweight schema. citeturn0search15turn0search19turn0search3

### How the AI stays “in context”

At a product-design level, the objective is **grounded generation**: the model should draft based on the Brand IQ fields, campaign brief, and selected calendar item. Architecturally, this is aligned with the well-established approach of combining generation with retrieved knowledge (commonly called retrieval-augmented generation) to improve factuality and relevance when the model alone may not contain the right project facts. citeturn2search3turn2search27turn3search1

**MVP grounding approach (simplest):**
- Do not start with complex semantic search.
- Inject Brand IQ as a structured “context pack” (shortened, bulletized) directly into the prompt for each generation request.
- Add a “Claims checklist” section in the prompt that forces the model to restate product facts it used.

**Phase 2 grounding (when you have >20–30 docs per project):**
- Add vector search with PostgreSQL + pgvector so the system can retrieve only the most relevant brand/product snippets for a given topic (instead of stuffing everything into context). pgvector is designed specifically for storing embeddings and running similarity search inside Postgres, and Supabase supports it as a Postgres extension. citeturn3search0turn3search1turn3search27

### Continuous improvement loop (without retraining)

You can make outputs “improve” over time without training a custom model by designing a feedback loop:

- Every generated output stores: **inputs → prompt template version → model used → final edited version → rating (“usable?”) → reason tags**.
- The system periodically suggests Brand IQ updates (e.g., “You keep removing the word ‘cheap’—add it to forbidden words?”).
- The Data team adds “what worked” notes per campaign that get summarized into reusable guidelines for the next month.

This is the same spirit as maintaining a living editorial calendar process: plan, execute, measure, and adapt. citeturn2search0turn2search26

## Minimal backend and data model

You asked to keep backend functional and simple; the goal is to support the UX above with the fewest moving parts.

### Minimal database objects (MVP)

- **workspace**: agency container
- **members**: users + role
- **projects**: per client/brand
- **brand_iq**: structured JSON fields + file links
- **campaigns**: brief + messaging matrix
- **calendar_items**: date, channel, format, campaign_id, status, owner_id
- **topics**: linked to calendar_item, selected flag
- **drafts**: linked to topic (store blocks + versions)
- **assets**: images/video files + metadata

### Storage and access control

If you use Supabase, a common pattern is:
- Supabase Auth for login and JWT-based sessions. citeturn0search17
- Postgres Row Level Security (RLS) policies to enforce “only members of this project can access rows.” Supabase emphasizes RLS as a Postgres primitive that can secure data end-to-end with Auth. citeturn0search1turn0search5
- Supabase Storage for uploaded brand guidelines and generated assets, with access controls designed to integrate with RLS. citeturn0search9

### AI provider integrations (designed for safety and simplicity)

**Important constraint:** a consumer ChatGPT subscription is *not* the same as API access; OpenAI states ChatGPT Plus does not include API usage, and API usage is billed separately. citeturn1search0turn1search20  
So the realistic design is:
- **Primary path:** one server-side API key for OpenRouter (or per-workspace key).
- **Optional “Bring your own key” per user/workspace:** store encrypted provider keys (OpenAI / Gemini / Anthropic), but only ever use them server-side.

Keeping keys server-side is critical because OpenAI’s API documentation explicitly warns that API keys are secrets and must not be exposed in client-side code. citeturn3search3

### Image generation notes for your stack

KIE’s docs describe an **asynchronous task model** where a successful request returns a `task_id`, and you get the final result by providing a callback URL (webhook) or polling by `task_id`. citeturn1search3turn1search11  
This suggests a simple MVP design:
- When user clicks “Generate images,” create task → store `task_id` → show “Generating…” state → poll every few seconds until ready → store asset URLs.

## Tech stack and deployment approach

Your requested constraints match a modern “simple stack” for fast shipping.

### Frontend and app backend

- **Next.js** for the full-stack web app: Route Handlers let you create backend endpoints inside the `app` directory, using the standard Web Request/Response APIs. citeturn3search2turn3search31  
- Deploy on **Vercel**: Vercel documents server-rendering Next.js via Vercel Functions, and describes Functions as server-side code that adapts to demand and is well suited to I/O-heavy workloads (including AI workloads). citeturn0search2turn0search6  
- Database/Auth/Storage on **Supabase**: marketed as a Postgres development platform bundling database, auth, storage, functions, and vector embeddings support. citeturn0search25turn0search17

### AI APIs in a simple provider strategy

- OpenRouter positions itself as a unified API access point with an OpenAI-compatible interface, normalizing responses across model providers, which is helpful when you want to switch between models without rewriting product logic. citeturn0search4turn0search0turn0search12  
- For direct providers: OpenAI documents API key authentication; Gemini supports API keys and also OAuth (with API key described as the easiest option); Anthropic’s API docs emphasize API key headers and official SDK support. citeturn3search3turn1search2turn1search18turn1search1  
- For images: KIE provides API docs and an asynchronous task flow. citeturn1search3turn1search11

### MVP delivery milestones (design-first)

- **Milestone A: UX skeleton**
  - Project list + Project Home
  - Brand IQ forms + file upload
  - Calendar (Month view) with statuses + drawers

- **Milestone B: The pipeline**
  - Generate Calendar (AI) → creates calendar_items
  - Generate Topics (AI) → creates topics, select one
  - Generate Content Draft (AI) → block editor + versioning

- **Milestone C: Production-ready workflow**
  - Approval workflow (Draft → Review → Approved)
  - Image generation integration + asset library
  - Export (CSV/copy) + basic audit trail

This keeps your “vibe coding” iteration loop focused on visible outcomes: each milestone is a screen users can interact with, not backend complexity.

