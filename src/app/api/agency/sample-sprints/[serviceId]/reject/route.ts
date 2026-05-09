import { NextResponse } from 'next/server'

import { rejectEngagement } from '@/lib/commercial/sample-sprints/approvals'

import { mapSampleSprintError, parseJsonBody, requireSampleSprintEntitlement } from '../../access'

export const dynamic = 'force-dynamic'

interface RejectBody {
  rejectionReason?: string | null
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  const { tenant, errorResponse } = await requireSampleSprintEntitlement('commercial.engagement.approve', 'approve')

  if (!tenant) return errorResponse

  const body = await parseJsonBody<RejectBody>(request)

  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  const { serviceId } = await params

  try {
    const approval = await rejectEngagement({
      serviceId,
      rejectedBy: tenant.userId,
      rejectionReason: body.rejectionReason ?? ''
    })

    return NextResponse.json(approval)
  } catch (error) {
    return mapSampleSprintError(error)
  }
}
