export interface AIGenerationOptions {
  systemPrompts: string[]
  userPrompt: string
  workspace_id?: string
  useHaiku?: boolean // true for faster/cheaper model (Claude Haiku)
  maxTokens?: number
}

export interface AIGenerationResult {
  success: boolean
  text: string
  usage: {
    input_tokens: number
    output_tokens: number
    cache_read_input_tokens: number
    cache_creation_input_tokens: number
    cost_usd: number
  }
  error?: string
}

export async function generateAIContent({
  systemPrompts,
  userPrompt,
  workspace_id,
  useHaiku = false,
  maxTokens = 2000
}: AIGenerationOptions): Promise<AIGenerationResult> {
  const useLocalAI = process.env.USE_LOCAL_AI === 'true'

  if (useLocalAI) {
    return await generateWithLocalAI({ systemPrompts, userPrompt, maxTokens })
  } else {
    return await generateWithAnthropic({ systemPrompts, userPrompt, workspace_id, useHaiku, maxTokens })
  }
}

async function generateWithLocalAI({ systemPrompts, userPrompt, maxTokens }: Omit<AIGenerationOptions, 'workspace_id' | 'useHaiku'>): Promise<AIGenerationResult> {
  const baseUrl = process.env.LOCAL_AI_BASE_URL || 'http://10.10.110.9:1234/v1'
  const modelName = process.env.LOCAL_AI_MODEL_NAME || 'google_gemma-4-e4b-it' // fallback

  const messages = [
    // Combine all system prompts into one for OpenAI compatibility
    { role: 'system', content: systemPrompts.join('\n\n') },
    { role: 'user', content: userPrompt }
  ]

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelName,
        messages,
        max_tokens: maxTokens,
        temperature: 0.7,
      })
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.error?.message || `Local AI error: ${response.status}`)
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content || '{}'
    
    // Usage info
    const inTokens = data.usage?.prompt_tokens || 0
    const outTokens = data.usage?.completion_tokens || 0

    return {
      success: true,
      text,
      usage: {
        input_tokens: inTokens,
        output_tokens: outTokens,
        cache_read_input_tokens: 0,
        cache_creation_input_tokens: 0,
        cost_usd: 0 // Free!
      }
    }
  } catch (error: any) {
    console.error('Local AI Error:', error)
    let errMsg = error.message
    if (errMsg === 'fetch failed' || errMsg.includes('timeout') || errMsg.includes('ECONNREFUSED')) {
      errMsg = `Koneksi ke Local AI gagal (${baseUrl}). Pastikan LM Studio sedang berjalan dan dapat diakses dari jaringan.`
    }
    return { success: false, text: '', usage: { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, cost_usd: 0 }, error: errMsg }
  }
}

async function generateWithAnthropic({ systemPrompts, userPrompt, workspace_id, useHaiku, maxTokens }: AIGenerationOptions): Promise<AIGenerationResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('Anthropic API key not configured')
  }

  const model = useHaiku ? 'claude-haiku-4-5-20251001' : 'claude-sonnet-4-20250514' // adjust models as per doc
  
  // Anthropic prompt caching
  const system = systemPrompts.length > 0 ? systemPrompts.map(text => ({
    type: 'text',
    text,
    cache_control: { type: 'ephemeral' }
  })) : undefined

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'prompt-caching-2024-07-31',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system,
        messages: [
          { role: 'user', content: userPrompt }
        ]
      })
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.error?.message || `Anthropic error: ${response.status}`)
    }

    const data = await response.json()
    const text = data.content?.[0]?.text || '{}'

    const inTokens = data.usage?.input_tokens || 0
    const outTokens = data.usage?.output_tokens || 0
    const cacheCreateTokens = data.usage?.cache_creation_input_tokens || 0
    const cacheReadTokens = data.usage?.cache_read_input_tokens || 0

    // Pricing (Approximate based on Sonnet 3.5 / Haiku 3)
    let inCost = 0, outCost = 0, cacheCreateCost = 0, cacheReadCost = 0
    if (useHaiku) {
      inCost = (inTokens / 1000000) * 0.25
      outCost = (outTokens / 1000000) * 1.25
    } else {
      inCost = (inTokens / 1000000) * 3.00
      outCost = (outTokens / 1000000) * 15.00
      cacheCreateCost = (cacheCreateTokens / 1000000) * 3.75
      cacheReadCost = (cacheReadTokens / 1000000) * 0.30
    }

    const totalCost = inCost + outCost + cacheCreateCost + cacheReadCost

    if (workspace_id && totalCost > 0) {
      try {
        const res = await fetch(`${process.env.NEXTAUTH_URL}/api/workspaces/${workspace_id}/usage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: totalCost })
        })
        if (!res.ok) console.error('Failed to log API usage')
      } catch (err) {
        console.error('Error logging API usage:', err)
      }
    }

    return {
      success: true,
      text,
      usage: {
        input_tokens: inTokens,
        output_tokens: outTokens,
        cache_read_input_tokens: cacheReadTokens,
        cache_creation_input_tokens: cacheCreateTokens,
        cost_usd: totalCost
      }
    }
  } catch (error: any) {
    console.error('Anthropic AI Error:', error)
    return { success: false, text: '', usage: { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, cost_usd: 0 }, error: error.message }
  }
}
