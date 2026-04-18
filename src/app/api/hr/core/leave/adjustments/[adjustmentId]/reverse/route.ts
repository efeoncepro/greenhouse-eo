import { NextResponse } from 'next/server'

import { reverseLeaveBalanceAdjustment } from '@/lib/hr-core/service'
import { assertHrEntitlement, requireHrCoreManageTenantContext, toHrCoreErrorResponse } from '@/lib/hr-core/shared'
import type { HrLeaveBalanceAdjustmentReverseInput } from '@/types/hr-core'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ adjustmentId: string }> }
) {
  const { tenant, errorResponse } = await requireHrCoreManageTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    assertHrEntitlement({
      tenant,
      capability: 'hr.leave_adjustment',
      action: 'update',
      scope: 'tenant'
    })

    const body = (await request.json().catch(() => null)) as HrLeaveBalanceAdjustmentReverseInput | null

    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { adjustmentId } = await params

    const created = await reverseLeaveBalanceAdjustment({
      tenant,
      adjustmentId,
      input: body,
      actorUserId: tenant.userId
    })

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to reverse leave adjustment.')
  }
}
