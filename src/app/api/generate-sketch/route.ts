import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json()
    
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    const safePrompt = prompt.substring(0, 900)

    // Build a quality-boosting prompt
    const qualityBoost = 'portrait, masterpiece, 4k, ray tracing, intricate details, highly-detailed, hyper-realistic, 8k RAW Editorial Photo. cinematic light, dramatic light, shallow depth of field, high budget, bokeh, cinemascope, film grain ISO 200 faded film, 35mm photo, grainy, vignette, vintage, Kodachrome, Lomography, stained, highly detailed, found footage'
    const fullPrompt = `${safePrompt}. ${qualityBoost}`
    const seed = Math.floor(Math.random() * 1000000000)
    
    // Load ComfyUI configuration
    const COMFYUI_URL = process.env.COMFYUI_API_URL || 'http://10.10.110.9:8188'
    
    // Construct ComfyUI Workflow JSON based on the user's provided structure
    const workflow = {
      "3": {
        "inputs": {
          "seed": seed,
          "steps": 30,
          "cfg": 8,
          "sampler_name": "euler",
          "scheduler": "normal",
          "denoise": 1,
          "model": [
            "4",
            0
          ],
          "positive": [
            "6",
            0
          ],
          "negative": [
            "7",
            0
          ],
          "latent_image": [
            "5",
            0
          ]
        },
        "class_type": "KSampler",
        "_meta": {
          "title": "KSampler"
        }
      },
      "4": {
        "inputs": {
          "ckpt_name": "epicrealismXL_pureFix.safetensors"
        },
        "class_type": "CheckpointLoaderSimple",
        "_meta": {
          "title": "Load Checkpoint"
        }
      },
      "5": {
        "inputs": {
          "width": 1024,
          "height": 1024,
          "batch_size": 1
        },
        "class_type": "EmptyLatentImage",
        "_meta": {
          "title": "Empty Latent Image"
        }
      },
      "6": {
        "inputs": {
          "text": fullPrompt,
          "clip": [
            "4",
            1
          ]
        },
        "class_type": "CLIPTextEncode",
        "_meta": {
          "title": "CLIP Text Encode (Prompt)"
        }
      },
      "7": {
        "inputs": {
          "text": "bad proportions, low resolution, bad, ugly, bad hands, bad teeth, terrible, painting, 3d, render, comic, anime, manga, unrealistic, flat, watermark, signature, worst quality, low quality",
          "clip": [
            "4",
            1
          ]
        },
        "class_type": "CLIPTextEncode",
        "_meta": {
          "title": "CLIP Text Encode (Prompt)"
        }
      },
      "8": {
        "inputs": {
          "samples": [
            "3",
            0
          ],
          "vae": [
            "4",
            2
          ]
        },
        "class_type": "VAEDecode",
        "_meta": {
          "title": "VAE Decode"
        }
      },
      "9": {
        "inputs": {
          "filename_prefix": "ComfyUI",
          "images": [
            "8",
            0
          ]
        },
        "class_type": "SaveImage",
        "_meta": {
          "title": "Save Image"
        }
      }
    }

    // 1. Queue Prompt in ComfyUI
    const promptRes = await fetch(`${COMFYUI_URL}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: workflow })
    })

    if (!promptRes.ok) {
      const errText = await promptRes.text().catch(() => 'Unknown ComfyUI Error')
      console.error('ComfyUI Prompt Error:', errText)
      return NextResponse.json({ error: `ComfyUI service error (${promptRes.status}): ${errText}` }, { status: promptRes.status })
    }

    const { prompt_id } = await promptRes.json()

    // 2. Poll for completion
    let attempts = 0
    let filename = ''
    while (attempts < 60) { // Max 60 attempts * 2s = 120s timeout
      await new Promise(r => setTimeout(r, 2000))
      const historyRes = await fetch(`${COMFYUI_URL}/history/${prompt_id}`)
      const historyJson = await historyRes.json()

      if (historyJson[prompt_id]) {
        // Find the SaveImage node output (node 9)
        const outputs = historyJson[prompt_id].outputs
        if (outputs && outputs["9"] && outputs["9"].images && outputs["9"].images.length > 0) {
          filename = outputs["9"].images[0].filename
          break
        }
      }
      attempts++
    }

    if (!filename) {
      return NextResponse.json({ error: 'Image generation timed out' }, { status: 504 })
    }

    // 3. Fetch the actual image file
    const imageRes = await fetch(`${COMFYUI_URL}/view?filename=${filename}&type=output`)
    if (!imageRes.ok) {
      return NextResponse.json({ error: 'Failed to download generated image from ComfyUI' }, { status: 500 })
    }

    // Convert to base64 Data URI
    const arrayBuffer = await imageRes.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const dataUri = `data:image/png;base64,${base64}`
    
    return NextResponse.json({ success: true, sketchUrl: dataUri })

  } catch (error: any) {
    console.error('Sketch generation error:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}

