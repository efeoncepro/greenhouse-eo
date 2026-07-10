import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { hiringNotFoundResponse } from '@/lib/hiring'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'
import { getHiringActivationDetail } from '@/lib/workforce/hiring-activation'

export const dynamic = 'force-dynamic'

/** TASK-770 — Detail de una activación: handoff + request + readiness LIVE (derivado). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'hiring.activation.review', 'execute', 'tenant')) {
    return canonicalErrorResponse('forbidden', {
      extra: { requiredCapability: 'hiring.activation.review' },
    })
  }

  const { id } = await params
  const detail = await getHiringActivationDetail(id)

  if (!detail) {
    return hiringNotFoundResponse('La activación no existe o el bridge está deshabilitado.', 'hiring_activation_not_found')
  }

  return NextResponse.json(detail)
}
