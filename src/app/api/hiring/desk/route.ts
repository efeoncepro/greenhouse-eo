import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { getHiringDeskSnapshot, toHiringErrorResponse } from '@/lib/hiring'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

/** TASK-355 — read model agregado, limitado y sin correo crudo. */
export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  const canReadOpening = can(tenant, 'hiring.opening.read', 'read', 'tenant')
  const canReadApplication = can(tenant, 'hiring.application.read', 'read', 'tenant')

  if (!canReadOpening || !canReadApplication) {
    return canonicalErrorResponse('forbidden', {
      extra: { requiredCapabilities: ['hiring.opening.read', 'hiring.application.read'] },
    })
  }

  try {
    const { searchParams } = new URL(request.url)
    const openingId = searchParams.get('openingId') || undefined
    const query = searchParams.get('query') || undefined
    const openingLimit = Number(searchParams.get('openingLimit'))
    const applicationLimit = Number(searchParams.get('applicationLimit'))

    const snapshot = await getHiringDeskSnapshot({
      openingId,
      query,
      ...(Number.isFinite(openingLimit) && openingLimit > 0 ? { openingLimit } : {}),
      ...(Number.isFinite(applicationLimit) && applicationLimit > 0 ? { applicationLimit } : {}),
    })

    return NextResponse.json(snapshot)
  } catch (error) {
    return toHiringErrorResponse(error, 'desk_snapshot')
  }
}
