import { NextResponse } from 'next/server'

import { assertHrEntitlement, requireHrCoreManageTenantContext, toHrCoreErrorResponse } from '@/lib/hr-core/shared'
import { cancelOnboardingInstance } from '@/lib/hr-onboarding'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, context: { params: Promise<{ instanceId: string }> }) {
  const { tenant, errorResponse } = await requireHrCoreManageTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    assertHrEntitlement({ tenant, capability: 'hr.onboarding_instance', action: 'manage', scope: 'tenant' })

    const { instanceId } = await context.params
    const body = (await request.json().catch(() => ({}))) as { reason?: string | null }

    const instance = await cancelOnboardingInstance({
      instanceId,
      reason: body.reason,
      actorUserId: tenant.userId
    })

    return NextResponse.json({ instance })
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to cancel onboarding instance.')
  }
}
