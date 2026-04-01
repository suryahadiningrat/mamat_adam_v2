import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const FCE_SYSTEM_PROMPT = `You are FCE — Floothink Content Engine. You are a senior brand strategist with deep expertise in campaign planning for Indonesian and Southeast Asian markets.

You always:
1. Build campaigns from a single, clear Big Idea that is grounded in the brand and product truth
2. Respect the BRAND BRAIN context — maintain brand tone and vocabulary rules
3. Structure campaigns with measurable pillars and clear audience journeys
4. Recommend realistic deliverables for the given channel mix and budget
5. Connect every recommendation back to the campaign objective

You never:
- Recommend tactics that contradict the brand's values or tone
- Make vague, generic recommendations not anchored to the specific brand/product context
- Hallucinate budget numbers or guarantees

Output format: ONLY valid JSON, no markdown, no explanation outside the JSON.`

const CAMPAIGN_OUTPUT_SCHEMA = `{
  "big_idea": "string — the single central campaign concept/creative platform (1-2 sentences)",
  "campaign_theme": "string — the thematic thread and tagline connecting all content",
  "message_pillars": ["string", "string", "string"],
  "audience_insight": "string — the key human truth about the target audience that justifies the strategy",
  "funnel_journey": {
    "awareness": "string — what we say/do at top of funnel",
    "consideration": "string — what we say/do at mid funnel",
    "conversion": "string — what we say/do at bottom of funnel"
  },
  "channel_role_mapping": { "channel_name": "role description" },
  "deliverables_recommendation": ["string", "string", "string"],
  "kpi_recommendation": ["string", "string", "string"],
  "rationale": "string — brief explanation of why this strategy fits the brand and objective"
}`

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      brand,
      product,
      campaignName,
      objective,
      audienceSegment,
      flightStart,
      flightEnd,
      budgetRange,
      keyMessage,
      channelMix,
      culturalContext,
      workspace_id
    } = body

    const brandContext = `
BRAND BRAIN:
- Brand: ${brand.name} (${brand.category})
- Personality: ${brand.personality || 'Not specified'}
- Tone of Voice: ${brand.toneOfVoice || 'Not specified'}
- Brand Promise: ${brand.brandPromise || 'Not specified'}
- Audience: ${brand.audience || 'Not specified'}

PRODUCT BRAIN:
- Product: ${product.name} (${product.type || 'General'})
- USP: ${product.usp || 'Not specified'}
- Target Audience: ${product.targetAudience || 'Same as brand'}
- Emotional Benefits: ${product.emotionalBenefits || 'Not specified'}`.trim()

    const userPrompt = `Generate a campaign strategy brief with these parameters:
- Campaign Name: ${campaignName}
- Objective: ${objective}
- Target Audience Segment: ${audienceSegment || 'Brand default audience'}
- Flight Dates: ${flightStart && flightEnd ? `${flightStart} to ${flightEnd}` : 'Not specified'}
- Budget Range: ${budgetRange || 'Not specified'}
- Key Message: ${keyMessage || 'Derive from Brand + Product Brain'}
- Channel Mix: ${channelMix?.length ? channelMix.join(', ') : 'All relevant channels'}
${culturalContext ? `- Cultural Context: ${culturalContext}` : ''}

Return ONLY this JSON structure:
${CAMPAIGN_OUTPUT_SCHEMA}`

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
          { type: 'text', text: FCE_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
          { type: 'text', text: brandContext, cache_control: { type: 'ephemeral' } }
        ],
        messages: [{ role: 'user', content: userPrompt }]
      })
    })

    if (!response.ok) {
      const err = await response.json()
      return NextResponse.json({ error: err.error?.message || 'Generation failed' }, { status: response.status })
    }

    const data = await response.json()
    const rawText = data.content?.[0]?.text || '{}'

    let parsed
    try {
      const clean = rawText.replace(/```json\n?|```\n?/g, '').trim()
      parsed = JSON.parse(clean)
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response', raw: rawText }, { status: 500 })
    }

    // Track API cost
    const inTokens = data.usage?.input_tokens || 0
    const outTokens = data.usage?.output_tokens || 0
    const cacheCreateTokens = data.usage?.cache_creation_input_tokens || 0
    const cacheReadTokens = data.usage?.cache_read_input_tokens || 0

    const totalCost =
      (inTokens / 1000000) * 3.00 +
      (outTokens / 1000000) * 15.00 +
      (cacheCreateTokens / 1000000) * 3.75 +
      (cacheReadTokens / 1000000) * 0.30

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
        cache_read_input_tokens: cacheReadTokens,
        cache_creation_input_tokens: cacheCreateTokens,
        cost_usd: totalCost
      }
    })

  } catch (error) {
    console.error('Campaign generation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
