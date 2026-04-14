import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return new NextResponse('Unauthorized', { status: 401 })

    const { searchParams } = new URL(req.url)
    const workspaceId = searchParams.get('workspaceId')
    if (!workspaceId) return new NextResponse('Workspace ID required', { status: 400 })

    const products = await prisma.product.findMany({
      where: { workspace_id: workspaceId },
      include: {
        brand: {
          select: { id: true, name: true }
        },
        brainVersions: {
          orderBy: { created_at: 'desc' },
          take: 1
        }
      },
      orderBy: { created_at: 'desc' }
    })

    const formatted = products.map((p: any) => {
      const brain = p.brainVersions[0] || null
      return {
        ...p,
        brain: brain ? {
          ...brain,
          functional_benefits: typeof brain.functional_benefits === 'string'
            ? brain.functional_benefits
            : JSON.stringify(brain.functional_benefits || []),
          emotional_benefits: typeof brain.emotional_benefits === 'string'
            ? brain.emotional_benefits
            : JSON.stringify(brain.emotional_benefits || []),
        } : undefined,
        brainVersions: undefined
      }
    })

    return NextResponse.json(formatted)
  } catch (error) {
    console.error(error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return new NextResponse('Unauthorized', { status: 401 })
    const userId = (session.user as any).id as string

    const body = await req.json()
    const { 
      workspaceId, brand_id, name, image_url, product_type, summary, 
      usp, rtb, functional_benefits, emotional_benefits, target_audience, price_tier 
    } = body

    const slug = name.toLowerCase().replace(/\s+/g, '-') + '-' + Math.floor(Math.random() * 1000)

    const product = await prisma.product.create({
      data: {
        workspace_id: workspaceId,
        brand_id,
        name,
        slug,
        image_url,
        product_type,
        summary,
        status: 'active',
        created_by: userId,
        brainVersions: {
          create: {
            workspace_id: workspaceId,
            brand_id,
            version_no: 1,
            usp,
            rtb,
            functional_benefits,
            emotional_benefits,
            target_audience,
            price_tier,
            status: 'approved',
            created_by: userId
          }
        }
      }
    })

    return NextResponse.json(product)
  } catch (error) {
    console.error(error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}