import { NextResponse } from 'next/server'

import {
  OFFBOARDING_CASE_STATUSES,
  transitionOffboardingCase,
  type OffboardingCaseStatus,
  type TransitionOffboardingCaseInput
} from '@/lib/workforce/offboarding'
import { assertHrEntitlement, requireHrCoreManageTenantContext, toHrCoreErrorResponse } from '@/lib/hr-core/shared'

export const dynamic = 'force-dynamic'

const actionForStatus = (status: OffboardingCaseStatus) => {
  if (status === 'approved') return 'approve'
  if (status === 'executed' || status === 'cancelled') return 'manage'

  return 'update'
}

export async function POST(request: Request, context: { params: Promise<{ caseId: string }> }) {
  const { tenant, errorResponse } = await requireHrCoreManageTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await request.json().catch(() => null)) as TransitionOffboardingCaseInput | null

    if (!body || !OFFBOARDING_CASE_STATUSES.includes(body.status as never)) {
      return NextResponse.json({ error: 'Invalid transition payload.' }, { status: 400 })
    }

    assertHrEntitlement({
      tenant,
      capability: 'hr.offboarding_case',
      action: actionForStatus(body.status),
      scope: 'tenant'
    })

    const { caseId } = await context.params

    const updated = await transitionOffboardingCase({
      caseId,
      input: body,
      actorUserId: tenant.userId
    })

    return NextResponse.json(updated)
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to transition offboarding case.')
  }
}
