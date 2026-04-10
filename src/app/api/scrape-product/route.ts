import { NextRequest, NextResponse } from 'next/server'
import { generateAIContent } from '@/lib/ai'

const EXTRACTION_PROMPT = `You are a product analyst. Based on the extracted website and social media content below, extract structured product information.

Return ONLY a valid JSON object with these exact fields (use empty string "" or empty array [] if not found):
{
  "name": "Product name",
  "product_type": "Type of product (e.g. SaaS, Physical Product, Service, Mobile App)",
  "summary": "2-3 sentence description of what this product does and who it's for",
  "usp": "The single most compelling reason to choose this product over alternatives",
  "rtb": "Evidence or proof points backing up the USP (e.g. stats, awards, testimonials, certifications)",
  "functional_benefits": ["Tangible benefit #1", "Tangible benefit #2", "Tangible benefit #3"],
  "emotional_benefits": ["Emotional benefit #1", "Emotional benefit #2"],
  "target_audience": "Description of the primary target customer (demographics, psychographics, job role, pain points)",
  "price_tier": "Pricing positioning (e.g. Premium, Mid-range, Budget, Freemium, Enterprise)"
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

    // Fetch all URLs in parallel using Jina Reader to bypass bot blocks and get clean Markdown
    const fetchPromises = urlsToScrape.slice(0, 5).map(async (u: string) => {
      const normalizedUrl = u.startsWith('http') ? u : `https://${u}`
      const jinaUrl = `https://r.jina.ai/${normalizedUrl}`

      try {
        const res = await fetch(jinaUrl, {
          signal: AbortSignal.timeout(15000),
          headers: { 'X-Return-Format': 'markdown' }
        })
        if (!res.ok) return `[Failed to fetch ${u} - HTTP ${res.status}]`
        const text = await res.text()
        return `=== Source: ${u} ===\n${text.slice(0, 8000)}`
      } catch (fetchErr: any) {
        return `[Error fetching ${u}: ${fetchErr.message}]`
      }
    })

    const results = await Promise.all(fetchPromises)
    let combinedText = results.join('\n\n')

    // Trim total length so we don't blow up Claude's context
    if (combinedText.length > 25000) {
      combinedText = combinedText.slice(0, 25000)
    }

    if (combinedText.replace(/\[Failed.*?\]|\[Error.*?\]/g, '').trim().length < 50) {
      return NextResponse.json({ error: 'Could not extract meaningful content from the provided URLs.' }, { status: 400 })
    }

    // Send to AI
      const aiResult = await generateAIContent({
        systemPrompts: [],
        userPrompt: EXTRACTION_PROMPT + combinedText,
        useHaiku: true,
        maxTokens: 1500
      })

      if (!aiResult.success) {
        return NextResponse.json({ error: aiResult.error || 'AI extraction failed' }, { status: 500 })
      }

      let parsed
      try {
        const clean = aiResult.text.replace(/```json\n?|```\n?/g, '').trim()
        parsed = JSON.parse(clean)
      } catch {
        return NextResponse.json({ error: 'Failed to parse extracted data', raw: aiResult.text }, { status: 500 })
      }

      return NextResponse.json({ success: true, data: parsed })
  } catch (error) {
    console.error('Scrape product error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
