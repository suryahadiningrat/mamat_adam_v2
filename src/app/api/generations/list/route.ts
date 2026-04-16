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
    
    if (!workspaceId) return new NextResponse('Missing workspaceId', { status: 400 })

    const outputs = await prisma.generationOutput.findMany({
      where: { workspace_id: workspaceId },
      include: {
        request: {
          include: {
            brand: true,
            product: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    })

    return NextResponse.json(outputs)
  } catch (error) {
    console.error(error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}