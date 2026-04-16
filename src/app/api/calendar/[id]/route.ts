import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!(session?.user as any)?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const id = params.id
    if (!id) {
      return NextResponse.json({ error: 'Missing ID' }, { status: 400 })
    }

    const item = await prisma.calendarItem.findUnique({
      where: { id }
    })

    if (!item) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json(item)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
