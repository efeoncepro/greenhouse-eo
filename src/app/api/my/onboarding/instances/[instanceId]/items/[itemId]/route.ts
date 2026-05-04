import { NextResponse } from 'next/server'

import { assertHrEntitlement, toHrCoreErrorResponse } from '@/lib/hr-core/shared'
import { updateOnboardingInstanceItemStatus } from '@/lib/hr-onboarding'
import { requireMyTenantContext } from '@/lib/tenant/authorization'
import { HR_ONBOARDING_ITEM_STATUSES } from '@/types/hr-onboarding'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: Request,
  context: { params: Promise<{ instanceId: string; itemId: string }> }
) {
  const { tenant, memberId, errorResponse } = await requireMyTenantContext()

  if (!tenant || !memberId) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    assertHrEntitlement({ tenant, capability: 'my.onboarding', action: 'update', scope: 'own' })

    const { instanceId, itemId } = await context.params
    const body = (await request.json().catch(() => null)) as { status?: string; notes?: string | null } | null

    if (!body?.status || !HR_ONBOARDING_ITEM_STATUSES.includes(body.status as never)) {
      return NextResponse.json({ error: 'Invalid onboarding task payload.' }, { status: 400 })
    }

    const instance = await updateOnboardingInstanceItemStatus({
      instanceId,
      instanceItemId: itemId,
      status: body.status as never,
      notes: body.notes,
      actorUserId: tenant.userId,
      actorMemberId: memberId
    })

    return NextResponse.json({ instance })
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to update your onboarding task.')
  }
}
