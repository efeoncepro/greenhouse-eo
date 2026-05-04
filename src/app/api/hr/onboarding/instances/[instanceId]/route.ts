import { NextResponse } from 'next/server'

import { assertHrEntitlement, requireHrCoreReadTenantContext, toHrCoreErrorResponse } from '@/lib/hr-core/shared'
import { getOnboardingInstance } from '@/lib/hr-onboarding'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, context: { params: Promise<{ instanceId: string }> }) {
  const { tenant, errorResponse } = await requireHrCoreReadTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    assertHrEntitlement({ tenant, capability: 'hr.onboarding_instance', action: 'read', scope: 'tenant' })

    const { instanceId } = await context.params
    const instance = await getOnboardingInstance(instanceId)

    return NextResponse.json({ instance })
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to load onboarding instance.')
  }
}
