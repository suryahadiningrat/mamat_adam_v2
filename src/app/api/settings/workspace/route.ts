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

    const userId = (session?.user as any).id
    const { searchParams } = new URL(req.url)
    const workspaceId = searchParams.get('workspaceId')

    if (!workspaceId) {
      return NextResponse.json({ error: 'Missing workspaceId' }, { status: 400 })
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId }
    })

    const role = await prisma.userWorkspaceRole.findFirst({
      where: { workspace_id: workspaceId, user_id: userId }
    })

    return NextResponse.json({ workspace, role: role?.role || 'viewer' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!(session?.user as any)?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session?.user as any).id
    const body = await req.json()
    const { workspaceId, name, description, api_limit_usd, logo_url, avatar_color, avatar_emoji } = body

    if (!workspaceId) {
      return NextResponse.json({ error: 'Missing workspaceId' }, { status: 400 })
    }

    // Verify admin role
    const role = await prisma.userWorkspaceRole.findFirst({
      where: { workspace_id: workspaceId, user_id: userId }
    })

    if (role?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden. Only admins can update workspace.' }, { status: 403 })
    }

    const workspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        name,
        description,
        logo_url,
        avatar_color,
        avatar_emoji,
        api_limit_usd: api_limit_usd ? parseFloat(api_limit_usd) : undefined
      }
    })

    return NextResponse.json({ workspace })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

