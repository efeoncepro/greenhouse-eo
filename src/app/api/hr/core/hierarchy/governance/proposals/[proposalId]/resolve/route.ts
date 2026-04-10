import { NextResponse } from 'next/server'

import { resolveHierarchyGovernanceProposal } from '@/lib/reporting-hierarchy/governance'
import { HrCoreValidationError, requireHrCoreManageTenantContext, toHrCoreErrorResponse } from '@/lib/hr-core/shared'

export const dynamic = 'force-dynamic'

type ResolveRequestBody = {
  resolution?: 'approve' | 'reject' | 'dismiss'
  note?: string | null
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ proposalId: string }> }
) {
  const { tenant, errorResponse } = await requireHrCoreManageTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { proposalId } = await params
    const body = (await request.json().catch(() => null)) as ResolveRequestBody | null
    const resolution = body?.resolution

    if (!resolution) {
      throw new HrCoreValidationError('resolution is required.')
    }

    const result = await resolveHierarchyGovernanceProposal({
      proposalId,
      resolution,
      actorUserId: tenant.userId,
      note: body?.note ?? null
    })

    return NextResponse.json(result)
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to resolve hierarchy governance proposal.')
  }
}
