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
    const user = await prisma.user.findUnique({ where: { id: userId } })
    
    if (!user?.is_superadmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Load workspaces
    const workspacesData = await prisma.workspace.findMany({
      select: { id: true, name: true, slug: true, api_usage_usd: true, api_limit_usd: true },
      orderBy: { name: 'asc' }
    })

    // Member counts
    const rolesData = await prisma.userWorkspaceRole.findMany({
      select: { workspace_id: true }
    })
    const countMap: Record<string, number> = {}
    rolesData.forEach((r: any) => { countMap[r.workspace_id] = (countMap[r.workspace_id] || 0) + 1 })

    const workspaces = workspacesData.map((w: any) => ({ ...w, member_count: countMap[w.id] || 0 }))

    // Load all users
    const allUsers = await prisma.user.findMany({
      select: { id: true, full_name: true, email: true, is_superadmin: true },
      orderBy: { full_name: 'asc' }
    })

    return NextResponse.json({ workspaces, allUsers })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!(session?.user as any)?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session?.user as any).id
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user?.is_superadmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { action } = body

    if (action === 'toggleSuperadmin') {
      const { targetUserId, isSuperadmin } = body
      await prisma.user.update({
        where: { id: targetUserId },
        data: { is_superadmin: isSuperadmin }
      })
      return NextResponse.json({ success: true })
    }

    if (action === 'getWorkspaceDetails') {
      const { workspaceId } = body
      const roles = await prisma.userWorkspaceRole.findMany({
        where: { workspace_id: workspaceId },
        include: { user: { select: { full_name: true, email: true } } }
      })
      const members = roles.map((r: any) => ({
        user_id: r.user_id,
        role: r.role,
        full_name: r.user?.full_name || null,
        email: r.user?.email || null
      }))
      const invites = await prisma.workspaceInvitation.findMany({
        where: { workspace_id: workspaceId, status: 'pending' },
        orderBy: { created_at: 'desc' }
      })
      return NextResponse.json({ members, invites })
    }

    if (action === 'removeMember') {
      const { workspaceId, memberId } = body
      await prisma.userWorkspaceRole.deleteMany({
        where: { workspace_id: workspaceId, user_id: memberId }
      })
      return NextResponse.json({ success: true })
    }

    if (action === 'updateRole') {
      const { workspaceId, memberId, newRole } = body
      await prisma.userWorkspaceRole.updateMany({
        where: { workspace_id: workspaceId, user_id: memberId },
        data: { role: newRole }
      })
      return NextResponse.json({ success: true })
    }

    if (action === 'revokeInvite') {
      const { inviteId } = body
      await prisma.workspaceInvitation.update({
        where: { id: inviteId },
        data: { status: 'revoked' }
      })
      return NextResponse.json({ success: true })
    }

    if (action === 'inviteMember') {
      const { workspaceId, email, role } = body
      const existingUser = await prisma.user.findUnique({ where: { email } })
      if (existingUser) {
        const alreadyMember = await prisma.userWorkspaceRole.findFirst({
          where: { workspace_id: workspaceId, user_id: existingUser.id }
        })
        if (alreadyMember) return NextResponse.json({ error: 'Already a member' }, { status: 400 })
        await prisma.userWorkspaceRole.create({
          data: { workspace_id: workspaceId, user_id: existingUser.id, role }
        })
        return NextResponse.json({ message: 'Added immediately' })
      } else {
        const existingInvite = await prisma.workspaceInvitation.findFirst({
          where: { workspace_id: workspaceId, invited_email: email, status: 'pending' }
        })
        if (existingInvite) return NextResponse.json({ error: 'Invite pending' }, { status: 400 })
        await prisma.workspaceInvitation.create({
          data: { workspace_id: workspaceId, invited_email: email, role, invited_by: userId }
        })
        return NextResponse.json({ message: 'Invite created' })
      }
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
