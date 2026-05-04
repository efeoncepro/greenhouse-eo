import { NextResponse } from 'next/server'

import { openContractExpiryReviewCases } from '@/lib/workforce/offboarding'
import {
  assertHrEntitlement,
  requireHrCoreManageTenantContext,
  toHrCoreErrorResponse
} from '@/lib/hr-core/shared'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireHrCoreManageTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    assertHrEntitlement({
      tenant,
      capability: 'hr.offboarding_case',
      action: 'create',
      scope: 'tenant'
    })

    const body = (await request.json().catch(() => ({}))) as {
      daysAhead?: number
      limit?: number
    }

    const result = await openContractExpiryReviewCases({
      actorUserId: tenant.userId,
      daysAhead: body.daysAhead,
      limit: body.limit
    })

    return NextResponse.json(result)
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to scan contract expiry offboarding cases.')
  }
}
