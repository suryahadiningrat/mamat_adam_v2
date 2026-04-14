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

    const filterPlatform = searchParams.get('platform')
    const filterStatus = searchParams.get('status')

    const topics = await prisma.contentTopic.findMany({
      where: { 
        workspace_id: workspaceId,
        ...(filterPlatform ? { platform: filterPlatform } : {}),
        ...(filterStatus ? { status: filterStatus } : {})
      },
      include: {
        brand: { select: { name: true } },
        product: { select: { name: true } }
      },
      orderBy: { publish_date: 'asc' }
    })

    return NextResponse.json(topics)
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
    const { topics } = body

    if (!Array.isArray(topics) || topics.length === 0) {
      return new NextResponse('Invalid topics array', { status: 400 })
    }

    // Use createMany instead of $transaction map for simpler batch insert
    const result = await prisma.contentTopic.createMany({
      data: topics.map((t: any) => ({
        workspace_id: t.workspace_id,
        brand_id: t.brand_id,
        product_id: t.product_id,
        content_title: t.content_title,
        content_pillar: t.content_pillar,
        content_format: t.content_format,
        platform: t.platform,
        objective: t.objective,
        publish_date: t.publish_date ? new Date(t.publish_date) : null,
        status: t.status || 'draft',
        created_by: userId,
      }))
    })

    return NextResponse.json({ success: true, count: result.count })
  } catch (error) {
    console.error(error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}