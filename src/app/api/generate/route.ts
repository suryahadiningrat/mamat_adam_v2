import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// FCE Base System Prompt — keep this static so it gets cached by Anthropic
const FCE_SYSTEM_PROMPT = `You are FCE — Floothink Content Engine. You are a senior brand strategist and copywriter with deep expertise in social media content for Indonesian and Southeast Asian markets.

You always:
1. Start from PRODUCT FACTS before adding promotional language
2. Respect the BRAND BRAIN context — never violate tone or vocabulary rules
3. Generate MODULAR outputs structured by the specified content format
4. Write platform-NATIVE content (TikTok = casual/native, LinkedIn = professional, Instagram = visual-first)
5. Include mandatory disclaimers when present in Product Brain
6. For carousel slides: each slide must have a standalone visual message
7. For video/reels: each scene must have clear action, dialogue, or visual beat

You never:
- Hallucinate product claims not explicitly in the Product Brain
- Use words from the vocabulary blacklist
- Generate content that contradicts brand values
- Write generic, un-branded copy

Output format: ONLY valid JSON, no markdown, no explanation outside the JSON.`

// ─── Dynamic Output Schemas ──────────────────────────────────────────────────

function getOutputSchema(outputFormat: string): string {
  const fmt = outputFormat?.toLowerCase() || 'single image'

  if (fmt.includes('carousel')) {
    return `{
  "content_title": "string — short internal title for this content piece (max 8 words, not shown publicly)",
  "slides": [
    {
      "slide_number": 1,
      "copy_on_visual": "string — bold, punchy text overlaid on the visual (max 10 words)",
      "visual_direction": "string — art direction note for this specific slide"
    }
  ],
  "caption": "string — the full Instagram/LinkedIn caption with CTA that accompanies the carousel post",
  "cta_options": ["string", "string", "string"],
  "hashtag_pack": ["string", "string", "string", "string", "string"],
  "rationale": "string — brief explanation of slide structure and angle chosen"
}
NOTE: Generate 5-7 slides. First slide = hook/attention, middle slides = value/proof, last slide = CTA.`
  }

  if (fmt.includes('reel') || fmt.includes('short') || fmt.includes('video') || fmt.includes('tiktok')) {
    return `{
  "content_title": "string — short internal title for this content piece (max 8 words, not shown publicly)",
  "scenes": [
    {
      "scene_number": 1,
      "script": "string — spoken dialogue, voiceover, or on-screen text for this scene",
      "visual_direction": "string — camera angle, action, transitions, b-roll description"
    }
  ],
  "caption": "string — the social media caption/description for this video post",
  "cta_options": ["string", "string", "string"],
  "hashtag_pack": ["string", "string", "string", "string", "string"],
  "rationale": "string — brief explanation of narrative arc and content choices"
}
NOTE: Generate 4-6 scenes (15-60 seconds total). Scene 1 = hook (first 3 seconds), middle = value, final = CTA.`
  }

  if (fmt.includes('story')) {
    return `{
  "content_title": "string — short internal title for this content piece (max 8 words, not shown publicly)",
  "copy_on_visual": "string — the main overlay text for the Story frame",
  "caption": "string — swipe-up/link text or sticker caption (keep very short)",
  "cta_options": ["string — Story CTA (e.g. Swipe Up, DM us, Link in bio)"],
  "visual_direction": "string — Story frame design: background, sticker placement, interactive element",
  "hashtag_pack": ["string", "string", "string"],
  "rationale": "string — brief rationale for the story angle"
}`
  }

  // Default: Single Image / Standard Post
  return `{
  "content_title": "string — short internal title for this content piece (max 8 words, not shown publicly)",
  "copy_on_visual": "string — the headline/overlay text on the visual (max 12 words, bold & scroll-stopping)",
  "caption": "string — the full caption body following the copywriting framework",
  "cta_options": ["string", "string", "string"],
  "hashtag_pack": ["string", "string", "string", "string", "string"],
  "visual_direction": "string — detailed art direction note for the visual (mood, lighting, scene, style)",
  "rationale": "string — brief explanation of why these choices were made based on brand context"
}`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      brand,
      product,
      platform,
      outputFormat,
      objective,
      framework,
      hookType,
      tone,
      visualStyle,
      outputLength,
      additionalContext,
      language = 'Indonesian',
      workspace_id
    } = body

    const fmtArr = (v: any) => Array.isArray(v) && v.length ? v.join(', ') : 'Not specified'
    const fmtList = (v: any) => Array.isArray(v) && v.length ? v.map((x: string) => `• ${x}`).join('\n') : 'Not specified'

    // Build the brand context string (this gets cached)
    const brandContext = `
BRAND BRAIN:
- Brand: ${brand.name}${brand.industry ? ` (${brand.industry})` : ''}
- Website: ${brand.website || 'Not specified'}
- Brand Summary: ${brand.brandSummary || 'Not specified'}
- Personality: ${brand.personality || 'Not specified'}
- Tone of Voice: ${brand.toneOfVoice || 'Not specified'}
- Brand Promise: ${brand.brandPromise || 'Not specified'}
- Brand Values: ${fmtArr(brand.brandValues)}
- Target Audience: ${brand.audience || 'Not specified'}
- Unique Selling Points: ${brand.uniqueSellingPoints || 'Not specified'}
- Content Language: ${brand.contentLanguage || 'Not specified'}
- Active Platforms: ${fmtArr(brand.socialPlatforms)}
- Content Pillars: ${fmtArr(brand.contentPillars)}
- Marketing Strategy: ${brand.marketingStrategy || 'Not specified'}
- Do's:
${fmtList(brand.dos)}
- Don'ts:
${fmtList(brand.donts)}
- Vocabulary Whitelist: ${brand.vocabularyWhitelist?.join(', ') || 'None specified'}
- Vocabulary Blacklist: ${brand.vocabularyBlacklist?.join(', ') || 'None specified'}

${product ? `PRODUCT BRAIN:
- Product: ${product.name} (${product.type || 'General'})
- USP: ${product.usp || 'Not specified'}
- RTB: ${product.rtb || 'Not specified'}
- Key Claims: ${product.keyClaims?.join('; ') || 'Not specified'}
- Target Audience: ${product.targetAudience || 'Same as brand'}
- Mandatory Disclaimers: ${product.mandatoryDisclaimers || 'None'}
- Emotional Benefits: ${product.emotionalBenefits || 'Not specified'}` : `PRODUCT BRAIN: Not applicable — this is brand-level content. Focus on brand values, pillars, and overall brand story rather than a specific product.`}`.trim()

    const schema = getOutputSchema(outputFormat || 'single image')

    // User request (always fresh, never cached)
    const userPrompt = `Generate content with these parameters:
- Platform: ${platform}
- Output Format: ${outputFormat || 'Single Image'}
- Objective: ${objective}
- Framework: ${framework}
- Hook Type: ${hookType}
- Tone Variation: ${tone || 'Default brand tone'}
- Visual Style: ${visualStyle || 'Brand default'}
- Output Length: ${outputLength || 'Medium'}
- Language: ${language}
${additionalContext ? `- Additional Context: ${additionalContext}` : ''}

Return ONLY this JSON structure:
${schema}`

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'prompt-caching-2024-07-31',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: [
          {
            type: 'text',
            text: FCE_SYSTEM_PROMPT,
            cache_control: { type: 'ephemeral' }
          },
          {
            type: 'text',
            text: brandContext,
            cache_control: { type: 'ephemeral' }
          }
        ],
        messages: [
          { role: 'user', content: userPrompt }
        ]
      })
    })

    if (!response.ok) {
      const err = await response.json()
      return NextResponse.json({ error: err.error?.message || 'Generation failed' }, { status: response.status })
    }

    const data = await response.json()
    const rawText = data.content?.[0]?.text || '{}'

    // Parse the JSON response
    let parsed
    try {
      const clean = rawText.replace(/```json\n?|```\n?/g, '').trim()
      parsed = JSON.parse(clean)
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response', raw: rawText }, { status: 500 })
    }

    // Calculate Usage costs
    const inTokens = data.usage?.input_tokens || 0
    const outTokens = data.usage?.output_tokens || 0
    const cacheCreateTokens = data.usage?.cache_creation_input_tokens || 0
    const cacheReadTokens = data.usage?.cache_read_input_tokens || 0

    const inCost = (inTokens / 1000000) * 3.00
    const outCost = (outTokens / 1000000) * 15.00
    const cacheCreateCost = (cacheCreateTokens / 1000000) * 3.75
    const cacheReadCost = (cacheReadTokens / 1000000) * 0.30
    const totalCost = inCost + outCost + cacheCreateCost + cacheReadCost

    if (workspace_id && totalCost > 0) {
      const { error: rpcError } = await supabase.rpc('increment_api_usage', {
        p_workspace_id: workspace_id,
        p_amount: totalCost
      })
      if (rpcError) console.error('Failed to log API usage:', rpcError)
    }

    return NextResponse.json({
      success: true,
      output: parsed,
      usage: {
        input_tokens: inTokens,
        output_tokens: outTokens,
        cache_read_input_tokens: data.usage?.cache_read_input_tokens || 0,
        cache_creation_input_tokens: data.usage?.cache_creation_input_tokens || 0,
        cost_usd: totalCost
      }
    })

  } catch (error) {
    console.error('Generation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
