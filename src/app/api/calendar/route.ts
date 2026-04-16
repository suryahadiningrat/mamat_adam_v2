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
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!workspaceId) return new NextResponse('Workspace ID required', { status: 400 })

    const [items, topics] = await Promise.all([
      prisma.calendarItem.findMany({
        where: { 
          workspace_id: workspaceId,
          date: {
            gte: startDate ? new Date(startDate) : undefined,
            lte: endDate ? new Date(endDate) : undefined,
          }
        },
        orderBy: { date: 'asc' }
      }),
      prisma.contentTopic.findMany({
        where: {
          workspace_id: workspaceId,
          publish_date: {
            gte: startDate ? new Date(startDate) : undefined,
            lte: endDate ? new Date(endDate) : undefined,
          }
        },
        orderBy: { publish_date: 'asc' }
      })
    ])

    // Map topics to look like calendar items so they appear on the calendar
    const mappedTopics = topics.map((t: any) => ({
      id: `topic-${t.id}`, // prefix to avoid collision
      workspace_id: t.workspace_id,
      campaign_id: null,
      title: `[Topic] ${t.content_title}`,
      date: t.publish_date,
      channel: t.platform || 'Unknown',
      format: t.content_format || 'Unknown',
      status: t.status,
      owner_id: t.created_by,
      created_by: t.created_by,
      created_at: t.created_at,
      updated_at: t.updated_at,
      is_topic: true,
      original_topic_id: t.id
    }))

    const combined = [...items, ...mappedTopics].sort((a, b) => {
      const dateA = new Date(a.date!).getTime()
      const dateB = new Date(b.date!).getTime()
      return dateA - dateB
    })

    return NextResponse.json(combined)
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
    const { workspace_id, campaign_id, title, date, channel, format, status, owner_id } = body

    if (!workspace_id || !title || !date) {
      return new NextResponse('Missing required fields', { status: 400 })
    }

    const item = await prisma.calendarItem.create({
      data: {
        workspace_id,
        campaign_id,
        title,
        date: new Date(date),
        channel,
        format,
        status: status || 'draft',
        owner_id,
        created_by: userId
      }
    })

    return NextResponse.json(item)
  } catch (error) {
    console.error(error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}