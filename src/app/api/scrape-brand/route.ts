import { NextRequest, NextResponse } from 'next/server'

// Strip HTML to readable plain text (fallback when Jina returns insufficient content)
function stripHtml(html: string): string {
  // Remove script, style, nav, footer, header, aside blocks entirely
  let text = html.replace(/<(script|style|nav|footer|header|aside|noscript)[^>]*>[\s\S]*?<\/\1>/gi, '')
  // Replace block-level closing tags with newline
  text = text.replace(/<\/(p|div|li|h[1-6]|section|article|main|br)>/gi, '\n')
  // Strip all remaining tags
  text = text.replace(/<[^>]+>/g, '')
  // Decode common HTML entities
  text = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
  // Collapse whitespace
  text = text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
  return text
}

async function fetchWithFallback(u: string): Promise<string> {
  const normalizedUrl = u.startsWith('http') ? u : `https://${u}`

  // Try Jina Reader first
  try {
    const jinaUrl = `https://r.jina.ai/${normalizedUrl}`
    const res = await fetch(jinaUrl, {
      signal: AbortSignal.timeout(15000),
      headers: { 'X-Return-Format': 'markdown' }
    })
    if (res.ok) {
      const text = await res.text()
      if (text.trim().length > 200) {
        return `=== Source: ${u} ===\n${text.slice(0, 8000)}`
      }
    }
  } catch {
    // Jina failed — fall through to direct fetch
  }

  // Fallback: direct fetch + HTML stripping
  try {
    const res = await fetch(normalizedUrl, {
      signal: AbortSignal.timeout(15000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FCE-Bot/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    })
    if (!res.ok) return `[Failed to fetch ${u} - HTTP ${res.status}]`
    const contentType = res.headers.get('content-type') || ''
    if (!contentType.includes('text/html')) return `[Non-HTML content at ${u}]`
    const html = await res.text()
    const plain = stripHtml(html).slice(0, 8000)
    if (plain.length < 100) return `[Insufficient content at ${u}]`
    return `=== Source: ${u} ===\n${plain}`
  } catch (err: any) {
    return `[Error fetching ${u}: ${err.message}]`
  }
}

const EXTRACTION_PROMPT = `You are a brand analyst. Based on the extracted website and social media content below, extract structured brand information.

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

Website and Social Media content:
`

export async function POST(req: NextRequest) {
  try {
    const { url, urls } = await req.json()
    const urlsToScrape = Array.isArray(urls) ? urls : (url ? [url] : [])
    
    if (urlsToScrape.length === 0) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Fetch all URLs in parallel — tries Jina Reader first, falls back to direct fetch + HTML strip
    const fetchPromises = urlsToScrape.slice(0, 5).map((u: string) => fetchWithFallback(u))

    const results = await Promise.all(fetchPromises)
    let combinedText = results.join('\n\n')
    
    // Trim total length so we don't blow up Claude's context
    if (combinedText.length > 25000) {
      combinedText = combinedText.slice(0, 25000)
    }

    if (combinedText.replace(/\[Failed.*?\]|\[Error.*?\]/g, '').trim().length < 50) {
      return NextResponse.json({ error: 'Could not extract meaningful content from the provided URLs.' }, { status: 400 })
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
          content: EXTRACTION_PROMPT + combinedText
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
