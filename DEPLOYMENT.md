# FCE Dashboard — Deployment & Setup Guide

## Stack Overview
- **Frontend + Routing**: Next.js 14 (App Router) on Vercel (free)
- **Database + Auth + Storage**: Supabase (free tier: 500MB DB, 50K users)
- **AI**: Anthropic API (pay-per-use, no monthly fee)
- **Source Control**: GitHub (free)
- **Estimated monthly cost**: $0 until ~1,000 active users

---

## 1. GitHub Setup

```bash
cd fce-dashboard
git init
git add .
git commit -m "feat: FCE dashboard initial setup"
# Create repo at github.com, then:
git remote add origin https://github.com/YOUR_ORG/fce-dashboard.git
git push -u origin main
```

---

## 2. Supabase Setup

1. Go to **supabase.com** → New Project
2. Name: `fce-prod`, Region: `Southeast Asia (Singapore)`
3. Once created → go to **SQL Editor** → paste `supabase-schema.sql` → Run
4. Go to **Settings → API** → copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Go to **Authentication → Providers** → enable Email

---

## 3. Vercel Deployment

1. Go to **vercel.com** → Add New Project → Import from GitHub
2. Select your `fce-dashboard` repo
3. Add Environment Variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhb...
   ANTHROPIC_API_KEY=sk-ant-...
   ```
4. Framework: Next.js (auto-detected)
5. Deploy → you'll get `fce-dashboard.vercel.app` instantly

---

## 4. Anthropic API Key

1. Go to **console.anthropic.com**
2. API Keys → Create Key
3. Paste as `ANTHROPIC_API_KEY` in Vercel env vars
4. **IMPORTANT**: Never expose this in client-side code — only use in Next.js Route Handlers (`/app/api/...`)

---

## 5. Prompt Efficiency — Save Credits

### Strategy A: Prompt Caching (most impactful, ~90% cost reduction)

Use Anthropic's prompt caching for the Brand Brain + Product Brain context:

```typescript
// /src/app/api/generate/route.ts
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'anthropic-beta': 'prompt-caching-2024-07-31', // Enable caching
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    system: [
      {
        type: 'text',
        text: STATIC_SYSTEM_PROMPT, // Your FCE base prompt
        cache_control: { type: 'ephemeral' } // Cache for 5 min
      },
      {
        type: 'text',
        text: brandBrainContext, // Brand Brain JSON — cache this too
        cache_control: { type: 'ephemeral' }
      }
    ],
    messages: [
      { role: 'user', content: userGenerationRequest } // Only new part
    ]
  })
})
// Result: only ~10% of tokens billed on repeat calls
```

### Strategy B: Model Routing (use cheaper models for lighter tasks)

| Task | Model | Cost |
|------|-------|------|
| Full content generation | claude-sonnet-4-20250514 | Standard |
| Recommendations, chips | claude-haiku-4-5-20251001 | ~8x cheaper |
| Brain completeness check | claude-haiku-4-5-20251001 | ~8x cheaper |
| Campaign strategy | claude-sonnet-4-20250514 | Standard |

### Strategy C: Selective Context Injection

Instead of sending the ENTIRE Brand Brain every time, only send relevant sections:

```typescript
// Build minimal context based on what's being generated
function buildContext(request: GenerationRequest) {
  const brand = await getBrandBrain(request.brandId)
  return {
    // Always include
    tone_of_voice: brand.tone_of_voice,
    vocabulary_blacklist: brand.vocabulary_blacklist,
    // Include only if platform-specific
    ...(request.platform === 'TikTok' && { tiktok_notes: brand.platform_notes?.tiktok }),
    // Include only if product content
    ...(request.productId && { usp: product.usp, key_claims: product.key_claims }),
  }
}
```

### Strategy D: Batch Generation

Instead of 3 separate calls for Hook / Copy / CTA — generate all in one call with structured output:

```typescript
// ONE call generates everything
const prompt = `Generate a complete content bundle for ${platform}.
Return ONLY valid JSON:
{
  "hook": "...",
  "main_copy": "...",
  "cta_options": ["...", "...", "..."],
  "hashtag_pack": ["...", "...", "..."],
  "visual_direction": "...",
  "rationale": "..."
}`
```

### Strategy E: Store & Reuse Generated Context

Cache the `source_context_summary` in the DB — don't regenerate it every request:

```sql
-- Already in schema: source_context_summary on generation_requests
-- When generating, check if same brand+product combo has recent context:
SELECT source_context_summary FROM generation_requests
WHERE brand_id = $1 AND product_id = $2
ORDER BY created_at DESC LIMIT 1;
```

---

## 6. Recommended FCE System Prompt Template

Save this as your base system prompt (gets cached):

```
You are FCE — Floothink Content Engine. You are a senior brand strategist and copywriter with deep expertise in social media content for Indonesian and Southeast Asian markets.

You always:
1. Start from PRODUCT FACTS before adding promotional language
2. Respect the BRAND BRAIN context — never violate tone or vocabulary rules
3. Generate MODULAR outputs (Hook, Copy, CTA, Hashtag, Visual Direction separately)
4. Write platform-NATIVE content (TikTok sounds casual, LinkedIn sounds professional)
5. Flag mandatory disclaimers when required by the Product Brain

You never:
- Hallucinate product claims not in the Product Brain
- Use vocabulary in the blacklist
- Generate content that contradicts brand values
- Write generic, un-branded copy

Output format: always respond in valid JSON only, no markdown.
```

---

## 7. Local Development

```bash
cp .env.local.example .env.local
# Fill in your Supabase URL, anon key, and Anthropic key

npm install
npm run dev
# → http://localhost:3000
```

---

## 8. Next Steps After Dashboard

Priority order to build next:
1. `/brands` — Brand Brain list + detail editor
2. `/generate` — Content Generator form + result screen
3. `/api/generate` — Route handler calling Anthropic API with caching
4. `/library` — Content Library with search/filter
5. `/campaigns` — Campaign Generator

---

## Free Tier Limits (when to upgrade)

| Service | Free Limit | Upgrade When |
|---------|-----------|--------------|
| Supabase | 500MB DB, 2GB bandwidth | >50 active users/day |
| Vercel | 100GB bandwidth | >10K visitors/month |
| Anthropic | Pay-per-use (no free tier) | Monitor spend in console |

**Estimated Anthropic cost for MVP usage**: ~$5–20/month with prompt caching enabled.
