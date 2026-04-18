import { NextResponse } from 'next/server'

import { createLeaveBalanceAdjustment, listLeaveBalanceAdjustments } from '@/lib/hr-core/service'
import { assertHrEntitlement, requireHrCoreManageTenantContext, toHrCoreErrorResponse } from '@/lib/hr-core/shared'
import type { HrLeaveBalanceAdjustmentInput } from '@/types/hr-core'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireHrCoreManageTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    assertHrEntitlement({
      tenant,
      capability: 'hr.leave_adjustment',
      action: 'create',
      scope: 'tenant'
    })

    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get('memberId')
    const year = searchParams.get('year')

    const payload = await listLeaveBalanceAdjustments({
      tenant,
      memberId,
      year: year ? Number(year) : null
    })

    return NextResponse.json(payload)
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to load leave adjustments.')
  }
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireHrCoreManageTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    assertHrEntitlement({
      tenant,
      capability: 'hr.leave_adjustment',
      action: 'create',
      scope: 'tenant'
    })

    const body = (await request.json().catch(() => null)) as HrLeaveBalanceAdjustmentInput | null

    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const created = await createLeaveBalanceAdjustment({
      tenant,
      input: body,
      actorUserId: tenant.userId
    })

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to create leave adjustment.')
  }
}
