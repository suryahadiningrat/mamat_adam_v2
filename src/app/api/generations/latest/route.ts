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
    const calendarId = searchParams.get('calendarId')
    const topicId = searchParams.get('topicId')

    if (!calendarId && !topicId) return NextResponse.json(null)

    const conditions: any[] = []
    if (calendarId) conditions.push({ calendar_id: calendarId })
    if (topicId) conditions.push({ topic_id: topicId })

    const output = await prisma.generationOutput.findFirst({
      where: {
        OR: conditions
      },
      include: {
        request: true
      },
      orderBy: { created_at: 'desc' }
    })

    return NextResponse.json(output || null)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
