import { NextRequest, NextResponse } from 'next/server'

const EXTRACTION_PROMPT = `You are a brand analyst. Based on the website content below, extract structured brand information.

Return ONLY a valid JSON object with these exact fields (use empty string "" or empty array [] if not found):
{
  "name": "Brand name",
  "industry": "Industry/sector (e.g. SaaS, F&B, Fashion, Healthcare)",
  "summary": "2-3 sentence brand description",
  "tone_of_voice": "e.g. Professional, Conversational, Bold, Playful",
  "brand_personality": "e.g. The Trusted Expert, The Bold Disruptor",
  "target_audience": "Description of primary target audience",
  "brand_values": ["value1", "value2", "value3"],
  "brand_promise": "Core brand promise or positioning statement",
  "unique_selling_points": "What makes this brand unique vs competitors",
  "content_pillars": ["pillar1", "pillar2", "pillar3"],
  "social_media_platforms": ["Instagram", "LinkedIn"],
  "content_language": "Primary content language (e.g. English, Indonesian, Bilingual)",
  "marketing_strategy": "Brief description of apparent marketing approach",
  "dos": ["Content do #1", "Content do #2"],
  "donts": ["Content dont #1", "Content dont #2"]
}

Website content:
`

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()
    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 })

    // Normalize URL
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`

    // Fetch the website
    let htmlContent = ''
    try {
      const res = await fetch(normalizedUrl, {
        signal: AbortSignal.timeout(10000),
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BrandScraper/1.0)' }
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      htmlContent = await res.text()
    } catch (fetchErr: any) {
      return NextResponse.json({ error: `Could not fetch website: ${fetchErr.message}` }, { status: 400 })
    }

    // Strip HTML to plain text
    const text = htmlContent
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
      .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
      .trim()
      .slice(0, 5000)

    if (text.length < 50) {
      return NextResponse.json({ error: 'Could not extract meaningful content from this URL.' }, { status: 400 })
    }

    // Send to Claude
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'API key not configured' }, { status: 500 })

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: EXTRACTION_PROMPT + text
        }]
      })
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'AI extraction failed' }, { status: 500 })
    }

    const data = await response.json()
    const rawText = data.content?.[0]?.text || '{}'

    let parsed
    try {
      const clean = rawText.replace(/```json\n?|```\n?/g, '').trim()
      parsed = JSON.parse(clean)
    } catch {
      return NextResponse.json({ error: 'Failed to parse extracted data' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: parsed })
  } catch (error) {
    console.error('Scrape error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
