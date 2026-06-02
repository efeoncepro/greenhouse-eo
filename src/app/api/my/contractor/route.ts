import { NextResponse } from 'next/server'

import { can } from '@/lib/entitlements/runtime'
import { resolveContractorSelfServiceProjection } from '@/lib/contractor-engagements/self-service-projection'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import { requireMyTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

/**
 * TASK-796 — `/api/my/contractor` (self-service, member-scoped).
 *
 * GET → returns the contractor self-service projection for the current member:
 *       active engagement + work submissions + payables + invoice support +
 *       readiness, mapped to the contractor-facing `ContractorSelfServiceScenario`
 *       (Finance-only data filtered out by the projection).
 *
 * Auth canónica: requireMyTenantContext (efeonce_internal + memberId no-null) +
 * capability `personal_workspace.contractor.read_self` (scope=own). The projection
 * resolves the engagement from the session's identityProfileId — the member can
 * only ever see their OWN engagement (no IDOR surface).
 */
export async function GET() {
  const { tenant, memberId, errorResponse } = await requireMyTenantContext()

  if (!tenant || !memberId) {
    return errorResponse ?? NextResponse.json({ error: 'Unauthorized', code: 'unauthorized' }, { status: 401 })
  }

  if (!can(tenant, 'personal_workspace.contractor.read_self', 'read', 'own')) {
    return NextResponse.json(
      { error: 'No tienes acceso a la vista contractor self-service.', code: 'forbidden', actionable: false },
      { status: 403 }
    )
  }

  const identityProfileId = tenant.identityProfileId

  if (!identityProfileId) {
    // Honest empty state — the member has no canonical identity profile linked yet.
    return NextResponse.json({
      state: 'no_engagement',
      scenario: null,
      degraded: [],
      generatedAt: new Date().toISOString(),
      contractVersion: 'contractor-self-service.v1'
    })
  }

  try {
    const projection = await resolveContractorSelfServiceProjection({ identityProfileId, memberId })

    return NextResponse.json(projection)
  } catch (error) {
    captureWithDomain(error, 'identity', {
      tags: { source: 'my_contractor', stage: 'GET' },
      extra: { memberId }
    })

    return NextResponse.json(
      { error: redactErrorForResponse(error), code: 'internal_error', actionable: true },
      { status: 500 }
    )
  }
}
