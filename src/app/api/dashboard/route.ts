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

    const [
      brands,
      productsCount,
      campaignsCount,
      // We don't have generation_outputs model in Prisma schema yet, so we will stub these
    ] = await Promise.all([
      prisma.brand.findMany({ 
        where: { workspace_id: workspaceId },
        select: { id: true, name: true, category: true, status: true, created_at: true },
        orderBy: { created_at: 'desc' }
      }),
      prisma.product.count({ where: { workspace_id: workspaceId } }),
      prisma.campaign.count({ where: { workspace_id: workspaceId } }),
    ])

    // For now, return stub data for generations and library since they aren't migrated to Prisma yet
    return NextResponse.json({
      user: { full_name: session.user.name },
      brands,
      productsCount,
      generationsCount: 0,
      campaignsCount,
      recentGenerations: [],
      libraryCounts: { approved: 0, draft: 0, rejected: 0 },
      brandStats: []
    })
  } catch (error) {
    console.error(error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}