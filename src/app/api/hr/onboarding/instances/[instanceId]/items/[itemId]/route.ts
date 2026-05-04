import { NextResponse } from 'next/server'

import { assertHrEntitlement, requireHrCoreManageTenantContext, toHrCoreErrorResponse } from '@/lib/hr-core/shared'
import { updateOnboardingInstanceItemStatus } from '@/lib/hr-onboarding'
import { HR_ONBOARDING_ITEM_STATUSES } from '@/types/hr-onboarding'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: Request,
  context: { params: Promise<{ instanceId: string; itemId: string }> }
) {
  const { tenant, errorResponse } = await requireHrCoreManageTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    assertHrEntitlement({ tenant, capability: 'hr.onboarding_instance', action: 'update', scope: 'tenant' })

    const { instanceId, itemId } = await context.params
    const body = (await request.json().catch(() => null)) as { status?: string; notes?: string | null } | null

    if (!body?.status || !HR_ONBOARDING_ITEM_STATUSES.includes(body.status as never)) {
      return NextResponse.json({ error: 'Invalid onboarding instance item payload.' }, { status: 400 })
    }

    const instance = await updateOnboardingInstanceItemStatus({
      instanceId,
      instanceItemId: itemId,
      status: body.status as never,
      notes: body.notes,
      actorUserId: tenant.userId,
      actorCanManage: true
    })

    return NextResponse.json({ instance })
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to update onboarding instance item.')
  }
}
