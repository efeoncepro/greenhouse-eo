import { NextResponse } from 'next/server'

import { assertHrEntitlement, toHrCoreErrorResponse } from '@/lib/hr-core/shared'
import { listOnboardingInstances } from '@/lib/hr-onboarding'
import { requireMyTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenant, memberId, errorResponse } = await requireMyTenantContext()

  if (!tenant || !memberId) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    assertHrEntitlement({ tenant, capability: 'my.onboarding', action: 'read', scope: 'own' })

    const instances = await listOnboardingInstances({
      memberId,
      status: 'active',
      limit: 50
    })

    return NextResponse.json({ instances })
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to load your onboarding tasks.')
  }
}
