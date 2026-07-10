import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'
import { listHiringActivationQueue } from '@/lib/workforce/hiring-activation'

export const dynamic = 'force-dynamic'

/**
 * TASK-770 — Cola de activación hiring→HRIS (handoffs internal_hire aprobados + estado del
 * request del bridge). Consumer: TASK-1368 (UI) + Nexa por parity.
 */
export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'hiring.activation.review', 'execute', 'tenant')) {
    return canonicalErrorResponse('forbidden', {
      extra: { requiredCapability: 'hiring.activation.review' },
    })
  }

  const url = new URL(request.url)
  const limit = Number(url.searchParams.get('limit') ?? 50) || 50

  const result = await listHiringActivationQueue({ limit })

  return NextResponse.json(result)
}
