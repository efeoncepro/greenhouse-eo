import { NextResponse } from 'next/server'

import { approveEngagement, type ProposedCapacityMember } from '@/lib/commercial/sample-sprints/approvals'

import { mapSampleSprintError, parseJsonBody, requireSampleSprintEntitlement } from '../../access'

export const dynamic = 'force-dynamic'

interface ApproveBody {
  proposedMembers?: ProposedCapacityMember[]
  capacityOverrideReason?: string | null
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  const { tenant, errorResponse } = await requireSampleSprintEntitlement('commercial.engagement.approve', 'approve')

  if (!tenant) return errorResponse

  const body = await parseJsonBody<ApproveBody>(request)

  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  const { serviceId } = await params

  try {
    const approval = await approveEngagement({
      serviceId,
      approvedBy: tenant.userId,
      proposedMembers: body.proposedMembers ?? [],
      capacityOverrideReason: body.capacityOverrideReason ?? null
    })

    return NextResponse.json(approval)
  } catch (error) {
    return mapSampleSprintError(error)
  }
}
