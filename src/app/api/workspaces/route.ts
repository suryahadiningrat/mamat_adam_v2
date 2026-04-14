import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !(session.user as any)?.id) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const userId = (session.user as any).id as string

    const roles = await prisma.userWorkspaceRole.findMany({
      where: { user_id: userId },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo_url: true,
            avatar_color: true,
            avatar_emoji: true,
            api_usage_usd: true,
            api_limit_usd: true,
          }
        }
      },
      orderBy: { created_at: 'desc' }
    })

    const workspaces = roles.map((r: any) => ({
      id: r.workspace.id,
      name: r.workspace.name,
      slug: r.workspace.slug,
      logo_url: r.workspace.logo_url,
      avatar_color: r.workspace.avatar_color,
      avatar_emoji: r.workspace.avatar_emoji,
      api_usage_usd: r.workspace.api_usage_usd,
      api_limit_usd: r.workspace.api_limit_usd,
      role: r.role,
    }))

    return NextResponse.json(workspaces)
  } catch (error) {
    console.error('Error fetching workspaces:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !(session.user as any)?.id) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const userId = (session.user as any).id as string
    const { name } = await req.json()

    if (!name) {
      return new NextResponse('Name is required', { status: 400 })
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') +
      '-' + Math.floor(Math.random() * 9000 + 1000)

    const workspace = await prisma.workspace.create({
      data: {
        name: name.trim(),
        slug,
        status: 'active',
        api_limit_usd: 20,
        created_by: userId,
        users: {
          create: {
            user_id: userId,
            role: 'admin'
          }
        }
      }
    })

    return NextResponse.json({ id: workspace.id })
  } catch (error) {
    console.error('Error creating workspace:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}