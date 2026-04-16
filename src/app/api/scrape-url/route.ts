import { NextRequest, NextResponse } from 'next/server'
import { generateAIContent } from '@/lib/ai'

function stripHtml(html: string): string {
  // Remove script, style, nav, footer, header, aside blocks entirely
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')
  // Replace block elements with newlines to preserve sentence boundaries
  text = text.replace(/<\/(p|div|h[1-6]|li|br|tr|blockquote)>/gi, '\n')
  // Strip remaining tags
  text = text.replace(/<[^>]+>/g, '')
  // Decode common HTML entities
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
  // Collapse whitespace
  text = text.replace(/\n{3,}/g, '\n\n').replace(/[ \t]+/g, ' ').trim()
  return text
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()

    if (!url || !/^https?:\/\//i.test(url)) {
      return NextResponse.json({ error: 'A valid URL starting with http:// or https:// is required' }, { status: 400 })
    }

    // Fetch the page
    let html: string
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ContentBot/1.0)',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(10000),
      })
      if (!response.ok) {
        return NextResponse.json({ error: `Could not fetch page (HTTP ${response.status}). The URL may require login or be unavailable.` }, { status: 422 })
      }
      const contentType = response.headers.get('content-type') || ''
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
        return NextResponse.json({ error: 'URL does not point to an HTML page (may be a PDF, image, or API endpoint).' }, { status: 422 })
      }
      html = await response.text()
    } catch (e: any) {
      const msg = e?.message || ''
      if (msg.includes('timeout') || msg.includes('aborted')) {
        return NextResponse.json({ error: 'Page took too long to load (>10s). Try a different URL.' }, { status: 422 })
      }
      return NextResponse.json({ error: 'Could not reach that URL. It may be blocked or require authentication.' }, { status: 422 })
    }

    const plainText = stripHtml(html).slice(0, 5000)

    if (plainText.length < 100) {
      return NextResponse.json({ error: 'Could not extract meaningful text from this page. It may be a JavaScript-rendered app or blocked content.' }, { status: 422 })
    }

    const extractPrompt = `You are a content intelligence assistant. Analyze the following web page text and extract structured information for use as creative context when generating social media content and marketing topics.

URL: ${url}

PAGE TEXT:
${plainText}

Extract and return ONLY valid JSON — no markdown, no explanation:
{
  "title": "Page title (max 100 chars)",
  "content_type": "one of: article | blog_post | product_page | landing_page | news | press_release | case_study | review | other",
  "main_topic": "One sentence: what is this page fundamentally about?",
  "key_claims": ["claim 1", "claim 2", "claim 3"],
  "tone": "e.g. professional, casual, urgent, inspirational, educational",
  "target_audience": "Who this content is written for (inferred)",
  "summary": "2–3 sentences summarizing the page for a content creator who wants to use it as reference",
  "content_angles": ["angle 1", "angle 2", "angle 3"]
}

Rules:
- key_claims: 3–5 most important statements or facts from the page
- content_angles: 3 specific social media post angles inspired by this content
- Keep all values concise — they will be injected into AI generation prompts
- If the page is mostly navigation/boilerplate with no real content, set main_topic to "Insufficient content" and return minimal data`

    const aiResult = await generateAIContent({
      systemPrompts: [],
      userPrompt: extractPrompt,
      useHaiku: true,
      maxTokens: 1000
    })

    if (!aiResult.success) {
      return NextResponse.json({ error: aiResult.error || 'Extraction failed' }, { status: 500 })
    }

    const rawText = aiResult.text

    let extracted: any
    try {
      extracted = JSON.parse(rawText.replace(/```json\n?|```\n?/g, '').trim())
    } catch {
      return NextResponse.json({ error: 'Failed to parse extracted data' }, { status: 500 })
    }

    if (extracted.main_topic === 'Insufficient content') {
      return NextResponse.json({ error: 'This page does not have enough readable content. Try a blog post, article, or product page.' }, { status: 422 })
    }

    // Build a pre-formatted context string ready to inject into generation prompts
    const contextString = [
      `REFERENCE MATERIAL (${extracted.content_type?.replace(/_/g, ' ')} from ${new URL(url).hostname}):`,
      `Title: ${extracted.title}`,
      `Topic: ${extracted.main_topic}`,
      extracted.key_claims?.length ? `Key claims:\n${extracted.key_claims.map((c: string) => `• ${c}`).join('\n')}` : null,
      `Tone: ${extracted.tone}`,
      `Audience: ${extracted.target_audience}`,
      `Summary: ${extracted.summary}`,
    ].filter(Boolean).join('\n')

    return NextResponse.json({
      success: true,
      url,
      extracted,
      contextString,
    })
  } catch (error) {
    console.error('Scrape URL error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
