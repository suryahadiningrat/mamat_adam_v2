import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return new NextResponse('Unauthorized', { status: 401 })

    const productId = params.id
    const body = await req.json()
    const { 
      brand_id, name, image_url, product_type, summary, 
      usp, rtb, functional_benefits, emotional_benefits, target_audience, price_tier,
      brainId
    } = body

    const product = await prisma.product.update({
      where: { id: productId },
      data: {
        name,
        image_url,
        product_type,
        summary,
        brand_id
      }
    })

    if (brainId) {
      await prisma.productBrainVersion.update({
        where: { id: brainId },
        data: {
          usp,
          rtb,
          functional_benefits,
          emotional_benefits,
          target_audience,
          price_tier
        }
      })
    } else {
       await prisma.productBrainVersion.create({
          data: {
            product_id: productId,
            brand_id,
            workspace_id: product.workspace_id,
            version_no: 1,
            usp,
            rtb,
            functional_benefits,
            emotional_benefits,
            target_audience,
            price_tier,
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

    await prisma.product.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}