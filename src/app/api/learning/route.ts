import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!(session?.user as any)?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const workspaceId = searchParams.get('workspaceId')

    if (!workspaceId) {
      return NextResponse.json({ error: 'Missing workspaceId' }, { status: 400 })
    }

    const outputs = await prisma.generationOutput.findMany({
      where: { workspace_id: workspaceId },
      include: {
        request: {
          include: { brand: true }
        }
      },
      orderBy: { created_at: 'desc' }
    })

    return NextResponse.json({ outputs })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}