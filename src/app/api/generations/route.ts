import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return new NextResponse('Unauthorized', { status: 401 })
    const userId = (session.user as any).id as string

    const body = await req.json()
    
    const request = await prisma.generationRequest.create({
      data: {
        workspace_id: body.workspace_id,
        brand_id: body.brand_id,
        product_id: body.product_id,
        platform: body.platform,
        output_format: body.output_format,
        objective: body.objective,
        tone_override: body.tone_override,
        visual_style: body.visual_style,
        output_length: body.output_length,
        additional_context: body.additional_context,
        source_context_summary: body.source_context_summary,
        status: 'completed',
        created_by: userId,
        generationOutputs: {
          create: {
            workspace_id: body.workspace_id,
            content_title: body.content_title,
            copy_on_visual: body.copy_on_visual,
            caption: body.caption,
            slides: body.slides,
            scenes: body.scenes,
            cta_options: body.cta_options,
            hashtag_pack: body.hashtag_pack,
            visual_direction: body.visual_direction,
            rationale: body.rationale,
            raw_response: body.raw_response,
            status: 'approved'
          }
        }
      }
    })

    return NextResponse.json({ success: true, id: request.id })
  } catch (error) {
    console.error(error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}