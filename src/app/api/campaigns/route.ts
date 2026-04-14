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

    const campaigns = await prisma.campaign.findMany({
      where: { workspace_id: workspaceId },
      include: {
        brand: { select: { name: true } },
        product: { select: { name: true } },
        campaignOutputs: {
          orderBy: { created_at: 'desc' },
          take: 1
        }
      },
      orderBy: { created_at: 'desc' }
    })

    const formatted = campaigns.map((c: any) => ({
      ...c,
      brands: c.brand,
      products: c.product,
      campaign_outputs: c.campaignOutputs
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
    const { 
      workspaceId, brand_id, product_id, name, objective, audience_segment, 
      flight_start, flight_end, budget_range, key_message, channel_mix, 
      cultural_context, output 
    } = body

    const campaign = await prisma.campaign.create({
      data: {
        workspace_id: workspaceId,
        brand_id,
        product_id,
        name,
        objective,
        audience_segment,
        flight_start: flight_start ? new Date(flight_start) : null,
        flight_end: flight_end ? new Date(flight_end) : null,
        budget_range,
        key_message,
        channel_mix,
        cultural_context,
        status: 'draft',
        created_by: userId,
        campaignOutputs: {
          create: {
            version_no: 1,
            big_idea: output.big_idea,
            campaign_theme: output.campaign_theme,
            message_pillars: output.message_pillars,
            audience_insight: output.audience_insight,
            funnel_journey: output.funnel_journey,
            channel_role_mapping: output.channel_role_mapping,
            deliverables_recommendation: output.deliverables_recommendation,
            kpi_recommendation: output.kpi_recommendation,
            rationale: output.rationale,
            status: 'draft'
          }
        }
      }
    })

    return NextResponse.json({ success: true, data: campaign })
  } catch (error) {
    console.error(error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}