import { NextRequest, NextResponse } from 'next/server'
import { generateAIContent } from '@/lib/ai'

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

    console.log('aa');

    // Fetch all URLs in parallel using Jina Reader to bypass bot blocks and get clean Markdown
    const fetchPromises = urlsToScrape.slice(0, 5).map(async (u: string) => {
      const normalizedUrl = u.startsWith('http') ? u : `https://${u}`
      const jinaUrl = `https://r.jina.ai/${normalizedUrl}`
      
      try {
        const res = await fetch(jinaUrl, {
          signal: AbortSignal.timeout(15000),
          headers: { 
            'X-Return-Format': 'markdown',
            'Accept': 'application/json' 
          }
        })
        if (!res.ok) {
          const errText = await res.text().catch(() => '')
          console.error(`Jina Error ${res.status}:`, errText)
          return `[Failed to fetch ${u} - HTTP ${res.status}]`
        }
        
        let text = await res.text()
        
        // Parse Jina JSON response if it's JSON
        try {
          const jinaJson = JSON.parse(text)
          if (jinaJson.data && jinaJson.data.content) {
            text = jinaJson.data.content
          }
        } catch (e) {
          // If not JSON, assume it's raw markdown
        }
        
        return `=== Source: ${u} ===\n${text.slice(0, 8000)}`
      } catch (fetchErr: any) {
        return `[Error fetching ${u}: ${fetchErr.message}]`
      }
    })

    const results = await Promise.all(fetchPromises)
    let combinedText = results.join('\n\n')
    console.log('COMBINED TEXT', combinedText);
    
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

      console.log("AI Result: ", aiResult);

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
    console.error('Scrape error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
