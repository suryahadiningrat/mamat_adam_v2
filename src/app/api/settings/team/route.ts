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

    const roles = await prisma.userWorkspaceRole.findMany({
      where: { workspace_id: workspaceId },
      include: {
        user: {
          select: { full_name: true, email: true }
        }
      }
    })

    const invites = await prisma.workspaceInvitation.findMany({
      where: { workspace_id: workspaceId, status: 'pending' },
      orderBy: { created_at: 'desc' }
    })

    const members = roles.map((r: any) => ({
      user_id: r.user_id,
      role: r.role,
      full_name: r.user?.full_name || null,
      email: r.user?.email || null,
    }))

    return NextResponse.json({ members, invites })
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

    const body = await req.json()
    const { action, workspaceId } = body

    if (!workspaceId) return NextResponse.json({ error: 'Missing workspaceId' }, { status: 400 })

    // Verify admin
    const userRole = await prisma.userWorkspaceRole.findFirst({
      where: { workspace_id: workspaceId, user_id: userId }
    })

    if (userRole?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden. Only admins can manage team.' }, { status: 403 })
    }

    if (action === 'invite') {
      const { email, role } = body
      const existingUser = await prisma.user.findUnique({ where: { email } })

      if (existingUser) {
        const alreadyMember = await prisma.userWorkspaceRole.findFirst({
          where: { workspace_id: workspaceId, user_id: existingUser.id }
        })

        if (alreadyMember) {
          return NextResponse.json({ error: 'This user is already a member of this workspace.' }, { status: 400 })
        }

        await prisma.userWorkspaceRole.create({
          data: {
            workspace_id: workspaceId,
            user_id: existingUser.id,
            role
          }
        })
        return NextResponse.json({ message: 'User added to workspace immediately.' })
      } else {
        const existingInvite = await prisma.workspaceInvitation.findFirst({
          where: { workspace_id: workspaceId, invited_email: email, status: 'pending' }
        })

        if (existingInvite) {
          return NextResponse.json({ error: 'This email already has a pending invite.' }, { status: 400 })
        }

        await prisma.workspaceInvitation.create({
          data: {
            workspace_id: workspaceId,
            invited_email: email,
            invited_by: userId,
            role
          }
        })
        return NextResponse.json({ message: 'Invite created for ' + email })
      }
    }

    if (action === 'updateRole') {
      const { memberId, newRole } = body
      await prisma.userWorkspaceRole.updateMany({
        where: { workspace_id: workspaceId, user_id: memberId },
        data: { role: newRole }
      })
      return NextResponse.json({ success: true })
    }

    if (action === 'removeMember') {
      const { memberId } = body
      await prisma.userWorkspaceRole.deleteMany({
        where: { workspace_id: workspaceId, user_id: memberId }
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

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
