import { NextRequest, NextResponse } from 'next/server'
import { copywritingSkill, socialContentSkill } from '@/lib/skills'
import { generateAIContent } from '@/lib/ai'

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
      workspace_id,
      language = 'Indonesian'
    } = body

    if (!brand?.name) {
      return NextResponse.json({ error: 'Brand is required' }, { status: 400 })
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

    const extraContext = context
      ? `\nADDITIONAL DIRECTION:\n${context}${referenceUrl ? `\nReference URL: ${referenceUrl}` : ''}`
      : referenceUrl
      ? `\nReference URL for inspiration: ${referenceUrl}`
      : ''

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
${extraContext}
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

    const aiResult = await generateAIContent({
      systemPrompts: [],
      userPrompt: prompt,
      workspace_id,
      useHaiku: true,
      maxTokens: 4000
    })

    if (!aiResult.success) {
      return NextResponse.json({ error: aiResult.error || 'Generation failed' }, { status: 500 })
    }

    let parsed: { topics: any[] }
    try {
      const clean = aiResult.text.replace(/```json\n?|```\n?/g, '').trim()
      parsed = JSON.parse(clean)
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response', raw: aiResult.text }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      topics: parsed.topics || [],
      usage: aiResult.usage
    })

  } catch (error) {
    console.error('Topic generation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
