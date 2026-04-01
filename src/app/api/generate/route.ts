import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// FCE Base System Prompt — keep this static so it gets cached by Anthropic
const FCE_SYSTEM_PROMPT = `You are FCE — Floothink Content Engine. You are a senior brand strategist and copywriter with deep expertise in social media content for Indonesian and Southeast Asian markets.

You always:
1. Start from PRODUCT FACTS before adding promotional language
2. Respect the BRAND BRAIN context — never violate tone or vocabulary rules
3. Generate MODULAR outputs (Hook, Copy, CTA, Hashtag, Visual Direction as separate fields)
4. Write platform-NATIVE content (TikTok = casual/native, LinkedIn = professional, Instagram = visual-first)
5. Include mandatory disclaimers when present in Product Brain

You never:
- Hallucinate product claims not explicitly in the Product Brain
- Use words from the vocabulary blacklist
- Generate content that contradicts brand values
- Write generic, un-branded copy

Output format: ONLY valid JSON, no markdown, no explanation outside the JSON.`

const FCE_OUTPUT_SCHEMA = `{
  "hook": "string — the opening line/sentence to stop the scroll",
  "main_copy": "string — the body copy following the framework",
  "cta_options": ["string", "string", "string"],
  "hashtag_pack": ["string", "string", "string", "string", "string"],
  "visual_direction": "string — mood, lighting, scene, style reference for art director",
  "rationale": "string — brief explanation of why these choices were made based on brand context"
}`

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      brand,
      product,
      platform,
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

PRODUCT BRAIN:
- Product: ${product.name} (${product.type || 'General'})
- USP: ${product.usp || 'Not specified'}
- RTB: ${product.rtb || 'Not specified'}
- Key Claims: ${product.keyClaims?.join('; ') || 'Not specified'}
- Target Audience: ${product.targetAudience || 'Same as brand'}
- Mandatory Disclaimers: ${product.mandatoryDisclaimers || 'None'}
- Emotional Benefits: ${product.emotionalBenefits || 'Not specified'}`.trim()

    // User request (always fresh, never cached)
    const userPrompt = `Generate content with these parameters:
- Platform: ${platform}
- Objective: ${objective}
- Framework: ${framework}
- Hook Type: ${hookType}
- Tone Variation: ${tone || 'Default brand tone'}
- Visual Style: ${visualStyle || 'Brand default'}
- Output Length: ${outputLength || 'Medium'}
- Language: ${language}
${additionalContext ? `- Additional Context: ${additionalContext}` : ''}

Return ONLY this JSON structure:
${FCE_OUTPUT_SCHEMA}`

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
        max_tokens: 1200,
        system: [
          {
            type: 'text',
            text: FCE_SYSTEM_PROMPT,
            cache_control: { type: 'ephemeral' } // Cache base prompt ~5 min
          },
          {
            type: 'text',
            text: brandContext,
            cache_control: { type: 'ephemeral' } // Cache brand context ~5 min
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
      // Strip any accidental markdown fences
      const clean = rawText.replace(/```json\n?|```\n?/g, '').trim()
      parsed = JSON.parse(clean)
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response', raw: rawText }, { status: 500 })
    }

    // Calculate Claude 3.5 Sonnet Usage in USD ($3/1M in, $15/1M out, $3.75 cache write, $0.30 cache read)
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

    // Return result with usage metadata (useful for monitoring costs)
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
