import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return new NextResponse('Unauthorized', { status: 401 })

    const topic = await prisma.contentTopic.findUnique({
      where: { id: params.id }
    })

    if (!topic) return new NextResponse('Not Found', { status: 404 })

    return NextResponse.json(topic)
  } catch (error) {
    console.error(error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return new NextResponse('Unauthorized', { status: 401 })

    const body = await req.json()
    const { status } = body

    const topic = await prisma.contentTopic.update({
      where: { id: params.id },
      data: { status }
    })

    return NextResponse.json(topic)
  } catch (error) {
    console.error(error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return new NextResponse('Unauthorized', { status: 401 })

    await prisma.contentTopic.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}