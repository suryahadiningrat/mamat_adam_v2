import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { amount } = await req.json()
    
    if (typeof amount !== 'number') {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    const workspace = await prisma.workspace.update({
      where: { id: params.id },
      data: {
        api_usage_usd: {
          increment: amount
        }
      }
    })

    return NextResponse.json({ success: true, usage: workspace.api_usage_usd })
  } catch (error) {
    console.error('Error updating usage:', error)
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
  }
}