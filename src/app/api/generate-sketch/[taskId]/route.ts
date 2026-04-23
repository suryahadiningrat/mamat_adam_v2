import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { taskId: string } }) {
  try {
    const { taskId } = params
    const task = await prisma.imageGenerationTask.findUnique({
      where: { id: taskId }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    if (task.status === 'completed') {
      return NextResponse.json({ status: 'completed', sketchUrl: task.image_url })
    }

    if (task.status === 'failed') {
      return NextResponse.json({ status: 'failed', error: task.error })
    }

    // Task is pending, check ComfyUI
    const COMFYUI_URL = process.env.COMFYUI_API_URL || 'http://10.10.110.9:8188'
    console.log(`[Task ${taskId}] Checking ComfyUI history for prompt_id: ${task.prompt_id}`);
    
    const historyRes = await fetch(`${COMFYUI_URL}/history/${task.prompt_id}`, { cache: 'no-store' })
    
    if (!historyRes.ok) {
      console.log(`[Task ${taskId}] History fetch failed with status: ${historyRes.status}`);
      return NextResponse.json({ status: 'pending' })
    }

    const historyJson = await historyRes.json()
    console.log(`[Task ${taskId}] History keys found:`, Object.keys(historyJson));

    if (historyJson[task.prompt_id]) {
      const outputs = historyJson[task.prompt_id].outputs
      console.log(`[Task ${taskId}] Outputs found:`, JSON.stringify(outputs));
      
      // ComfyUI output node might not always be "9", find the first node with images
      let filename = null;
      if (outputs) {
        for (const nodeId in outputs) {
          if (outputs[nodeId].images && outputs[nodeId].images.length > 0) {
            filename = outputs[nodeId].images[0].filename;
            break;
          }
        }
      }

      if (filename) {
        console.log(`[Task ${taskId}] Found filename: ${filename}, downloading...`);
        
        // Fetch image
        const imageRes = await fetch(`${COMFYUI_URL}/view?filename=${filename}&type=output`)
        if (imageRes.ok) {
          const arrayBuffer = await imageRes.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)

          // Save to local public/uploads/images
          const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'images')
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true })
          }

          const localFilename = `gen_${task.id}.png`
          const filePath = path.join(uploadDir, localFilename)
          fs.writeFileSync(filePath, buffer)

          const imageUrl = `/uploads/images/${localFilename}`
          console.log(`[Task ${taskId}] Image saved successfully to ${imageUrl}`);

          // Update task in DB
          await prisma.imageGenerationTask.update({
            where: { id: task.id },
            data: {
              status: 'completed',
              image_url: imageUrl
            }
          })

          return NextResponse.json({ status: 'completed', sketchUrl: imageUrl })
        } else {
          console.log(`[Task ${taskId}] Failed to fetch image from /view endpoint. Status: ${imageRes.status}`);
          // Failed to fetch image
          await prisma.imageGenerationTask.update({
            where: { id: task.id },
            data: { status: 'failed', error: 'Failed to download image from ComfyUI' }
          })
          return NextResponse.json({ status: 'failed', error: 'Failed to download image' })
        }
      } else {
        console.log(`[Task ${taskId}] No filename found in outputs.`);
      }
    } else {
      // Could be in queue, let's check queue just for logging
      try {
        const queueRes = await fetch(`${COMFYUI_URL}/queue`, { cache: 'no-store' });
        if (queueRes.ok) {
          const queueJson = await queueRes.json();
          const inPending = queueJson.queue_pending.some((q: any) => q[1] === task.prompt_id);
          const inRunning = queueJson.queue_running.some((q: any) => q[1] === task.prompt_id);
          console.log(`[Task ${taskId}] Not in history. In pending queue: ${inPending}, In running queue: ${inRunning}`);
        }
      } catch (e) {}
    }

    // Still processing
    return NextResponse.json({ status: 'pending' })

  } catch (error: any) {
    console.error('Task status check error:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}
