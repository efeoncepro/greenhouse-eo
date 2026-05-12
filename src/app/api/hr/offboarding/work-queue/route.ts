import { NextResponse } from 'next/server'

import {
  getOffboardingWorkQueue,
  OFFBOARDING_CASE_STATUSES
} from '@/lib/workforce/offboarding'
import {
  assertHrEntitlement,
  requireHrCoreReadTenantContext,
  toHrCoreErrorResponse
} from '@/lib/hr-core/shared'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireHrCoreReadTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    for (const capability of ['hr.offboarding_case', 'hr.final_settlement', 'hr.final_settlement_document'] as const) {
      assertHrEntitlement({
        tenant,
        capability,
        action: 'read',
        scope: 'tenant'
      })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const memberId = searchParams.get('memberId')
    const limit = searchParams.get('limit')

    const workQueue = await getOffboardingWorkQueue({
      status: status === 'active' || OFFBOARDING_CASE_STATUSES.includes(status as never) ? status as never : null,
      memberId,
      limit: limit ? Number(limit) : undefined
    })

    return NextResponse.json(workQueue)
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to load offboarding work queue.')
  }
}
