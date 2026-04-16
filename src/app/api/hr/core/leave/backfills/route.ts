import { NextResponse } from 'next/server'

import { createLeaveBackfill } from '@/lib/hr-core/service'
import { assertHrEntitlement, requireHrCoreManageTenantContext, toHrCoreErrorResponse } from '@/lib/hr-core/shared'
import type { HrLeaveBackfillInput } from '@/types/hr-core'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireHrCoreManageTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    assertHrEntitlement({
      tenant,
      capability: 'hr.leave_backfill',
      action: 'create',
      scope: 'tenant'
    })

    const body = (await request.json().catch(() => null)) as HrLeaveBackfillInput | null

    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const created = await createLeaveBackfill({
      tenant,
      input: body,
      actorUserId: tenant.userId
    })

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to create leave backfill.')
  }
}
