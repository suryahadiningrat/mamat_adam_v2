import { NextRequest, NextResponse } from 'next/server'
import { generateAIContent } from '@/lib/ai'

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

    const aiResult = await generateAIContent({
      systemPrompts: [FCE_SYSTEM_PROMPT, brandContext],
      userPrompt,
      workspace_id,
      maxTokens: 2000
    })

    if (!aiResult.success) {
      return NextResponse.json({ error: aiResult.error || 'Generation failed' }, { status: 500 })
    }

    let parsed
    try {
      const clean = aiResult.text.replace(/```json\n?|```\n?/g, '').trim()
      parsed = JSON.parse(clean)
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response', raw: aiResult.text }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      output: parsed,
      usage: aiResult.usage
    })

  } catch (error) {
    console.error('Campaign generation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
