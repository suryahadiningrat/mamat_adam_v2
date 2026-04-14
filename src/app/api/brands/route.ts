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
    if (!workspaceId) return new NextResponse('Workspace ID required', { status: 400 })

    const brands = await prisma.brand.findMany({
      where: { workspace_id: workspaceId },
      include: {
        brainVersions: {
          orderBy: { created_at: 'desc' },
          take: 1
        }
      },
      orderBy: { created_at: 'desc' }
    })

    const formatted = brands.map((b: any) => ({
      ...b,
      brain: b.brainVersions[0] || null,
      brainVersions: undefined
    }))

    return NextResponse.json(formatted)
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
    const { workspaceId, name, category, summary, brand_personality, tone_of_voice, brand_promise, brand_values, audience_persona, messaging_rules } = body

    const slug = name.toLowerCase().replace(/\s+/g, '-') + '-' + Math.floor(Math.random() * 1000)

    const brand = await prisma.brand.create({
      data: {
        workspace_id: workspaceId,
        name,
        slug,
        category,
        summary,
        status: 'active',
        created_by: userId,
        brainVersions: {
          create: {
            workspace_id: workspaceId,
            version_no: 1,
            brand_personality,
            tone_of_voice,
            brand_promise,
            brand_values,
            audience_persona,
            source_summary: summary,
            messaging_rules,
            status: 'approved',
            created_by: userId
          }
        }
      },
      include: {
        brainVersions: true
      }
    })

    return NextResponse.json(brand)
  } catch (error) {
    console.error(error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}