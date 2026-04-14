import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return new NextResponse('Unauthorized', { status: 401 })

    const brandId = params.id
    const body = await req.json()
    const { category, summary, brand_personality, tone_of_voice, brand_promise, brand_values, audience_persona, messaging_rules, name, brainId } = body

    const brand = await prisma.brand.update({
      where: { id: brandId },
      data: {
        name,
        category,
        summary,
      }
    })

    if (brainId) {
      await prisma.brandBrainVersion.update({
        where: { id: brainId },
        data: {
          brand_personality,
          tone_of_voice,
          brand_promise,
          brand_values,
          audience_persona,
          source_summary: summary,
          messaging_rules
        }
      })
    } else {
       await prisma.brandBrainVersion.create({
          data: {
            brand_id: brandId,
            workspace_id: brand.workspace_id,
            version_no: 1,
            brand_personality,
            tone_of_voice,
            brand_promise,
            brand_values,
            audience_persona,
            source_summary: summary,
            messaging_rules,
            status: 'approved'
          }
       })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return new NextResponse('Unauthorized', { status: 401 })

    await prisma.brand.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}