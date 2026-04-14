import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return new NextResponse('Unauthorized', { status: 401 })

    const workspaceId = params.id
    
    // Default placeholder for now, since we haven't migrated everything
    const [workspace, brandsCount, productsCount, campaignsCount] = await Promise.all([
      prisma.workspace.findUnique({ where: { id: workspaceId } }),
      prisma.brand.count({ where: { workspace_id: workspaceId } }),
      prisma.product.count({ where: { workspace_id: workspaceId } }),
      prisma.campaign.count({ where: { workspace_id: workspaceId } })
    ])

    return NextResponse.json({
      usage: {
        used: workspace?.api_usage_usd || 0,
        limit: workspace?.api_limit_usd || 20
      },
      counts: {
        brands: brandsCount,
        products: productsCount,
        library: campaignsCount, // using campaigns as placeholder for library for now
        topics: 0
      },
      isSuperadmin: false
    })
  } catch (error) {
    console.error(error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}