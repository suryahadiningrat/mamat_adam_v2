import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { copywritingSkill, socialContentSkill } from '@/lib/skills'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      brand,
      products,
      platform,
      count = 10,
      dateFrom,
      dateTo,
      context,
      referenceUrl,
      referenceSummary,
      workspace_id,
      language = 'Indonesian'
    } = body

    if (!brand?.name) {
      return NextResponse.json({ error: 'Brand is required' }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    const fmtArr = (v: any) =>
      Array.isArray(v) && v.length ? v.join(', ') : null

    const pillars = fmtArr(brand.contentPillars)
    const platforms = fmtArr(brand.socialPlatforms)

    const contentFormats = platform?.toLowerCase().includes('tiktok')
      ? ['TikTok Video', 'TikTok Story']
      : platform?.toLowerCase().includes('youtube')
      ? ['YouTube Short', 'YouTube Video']
      : platform?.toLowerCase().includes('linkedin')
      ? ['Single Image', 'Carousel', 'Article/Post']
      : ['Single Image', 'Carousel', 'Reel / Short Video', 'Story']

    const productContext = products && products.length > 0
      ? products.length === 1
        ? `Product focus: ${products[0].name}. USP: ${products[0].usp || 'Not specified'}.`
        : `Distribute topics across these products (assign one product_id per topic):\n${products.map((p: { id: string; name: string; usp: string }) => `- id: "${p.id}", name: "${p.name}", usp: "${p.usp || 'Not specified'}"`).join('\n')}`
      : `No specific product — generate brand-level or educational/awareness topics.`

    const hasReference = !!(referenceSummary || referenceUrl)

    const extraContext = [
      referenceSummary
        ? referenceSummary
        : referenceUrl
        ? `REFERENCE URL: ${referenceUrl}`
        : null,
      context ? `ADDITIONAL DIRECTION FROM USER:\n${context}` : null,
    ].filter(Boolean).join('\n\n')

    const dateContext = dateFrom && dateTo
      ? `Spread publish dates between ${dateFrom} and ${dateTo}.`
      : dateFrom
      ? `All topics from ${dateFrom} onward, spaced a few days apart.`
      : `Suggest publish dates starting from today, spaced 2-4 days apart.`

    const prompt = `You are a social media content strategist for ${brand.name}.

BRAND CONTEXT:
- Industry: ${brand.industry || 'Not specified'}
- Tone: ${brand.toneOfVoice || 'Not specified'}
- Personality: ${brand.personality || 'Not specified'}
- Target Audience: ${brand.audience || 'Not specified'}
- Content Pillars: ${pillars || 'Not specified'}
- Active Platforms: ${platforms || platform || 'Not specified'}
- Marketing Strategy: ${brand.marketingStrategy || 'Not specified'}
${brand.brandSummary ? `- Brand Summary: ${brand.brandSummary}` : ''}

${productContext}
${extraContext ? `${extraContext}\n` : ''}
TASK:
Generate exactly ${count} content topic ideas for ${platform || 'social media'}.
${dateContext}

For each topic, choose the most appropriate content format from: ${contentFormats.join(', ')}.
${pillars ? `Assign each topic to one of the brand's content pillars: ${pillars}. Distribute topics evenly across pillars.` : 'Assign a relevant content pillar to each topic.'}

Rules:
- Titles must be specific, actionable, and scroll-stopping (not generic)
- Mix different formats — don't repeat the same format more than 3 times in a row
- Make titles feel native to ${platform || 'social media'} (${language} market context)
- Each title should clearly communicate what the post is about
- Vary the angle: educational, product feature, lifestyle, testimonial/proof, behind-the-scenes, trend-based
${hasReference ? `- IMPORTANT: Use the reference material above as direct inspiration. Derive topic angles, claims, and themes from it — do not ignore it. At least half the topics should clearly reflect the reference content.` : ''}

=== EXPERT MARKETING GUIDELINES ===
Follow the principles in these guidelines when conceptualizing the topic angles:

<copywriting_skill>
${copywritingSkill}
</copywriting_skill>

<social_content_skill>
${socialContentSkill}
</social_content_skill>
===================================

Return ONLY valid JSON — no markdown, no explanation:
{
  "topics": [
    {
      "content_title": "string",
      "content_pillar": "string",
      "content_format": "string",
      "publish_date": "YYYY-MM-DD"${products && products.length > 1 ? `,\n      "product_id": "use the exact id string from the product list above"` : ''}
    }
  ]
}`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    if (!response.ok) {
      const err = await response.json()
      return NextResponse.json({ error: err.error?.message || 'Generation failed' }, { status: response.status })
    }

    const data = await response.json()
    const rawText = data.content?.[0]?.text || '{}'

    let parsed: { topics: any[] }
    try {
      const clean = rawText.replace(/```json\n?|```\n?/g, '').trim()
      parsed = JSON.parse(clean)
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response', raw: rawText }, { status: 500 })
    }

    // Track cost
    const inTokens = data.usage?.input_tokens || 0
    const outTokens = data.usage?.output_tokens || 0
    const totalCost = (inTokens / 1000000) * 0.80 + (outTokens / 1000000) * 4.00

    if (workspace_id && totalCost > 0) {
      await supabase.rpc('increment_api_usage', { p_workspace_id: workspace_id, p_amount: totalCost })
    }

    return NextResponse.json({
      success: true,
      topics: parsed.topics || [],
      usage: { input_tokens: inTokens, output_tokens: outTokens, cost_usd: totalCost }
    })

  } catch (error) {
    console.error('Topic generation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
