import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json()
    
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    const safePrompt = prompt.substring(0, 900)

    // Build a quality-boosting prompt that AMPLIFIES the visual direction rather than fighting it.
    // We add industry-standard photography/illustration quality terms as a suffix.
    const qualityBoost = 'professional advertising photography, high resolution, sharp focus, commercial grade, cinematic composition, studio quality lighting, ultra-detailed'
    const fullPrompt = `${safePrompt}. ${qualityBoost}`
    const encodedPrompt = encodeURIComponent(fullPrompt)
    const seed = Math.floor(Math.random() * 1000000)
    
    // Use flux model for maximum accuracy to the prompt
    const fetchUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?nologo=true&width=768&height=768&seed=${seed}&model=flux`
    
    // We proxy the fetch to avoid browser adblockers blocking pollinations.ai
    const response = await fetch(fetchUrl, { method: 'GET' })

    if (!response.ok) {
      const errText = await response.text().catch(() => 'No text returned');
      console.error(`Pollinations error ${response.status}:`, errText);
      return NextResponse.json({ error: `AI service error (${response.status}): ${errText}` }, { status: response.status })
    }

    // Convert to base64 Data URI so we don't have to deal with Supabase Storage policies
    const arrayBuffer = await response.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const dataUri = `data:image/jpeg;base64,${base64}`
    
    return NextResponse.json({ success: true, sketchUrl: dataUri })

  } catch (error: any) {
    console.error('Sketch generation error:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}

