import { NextResponse } from 'next/server'

import { canonicalErrorResponse, type CanonicalErrorCode } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import {
  requestGraderRunForOrganization,
  type RequestRunBlockedReason
} from '@/lib/growth/ai-visibility/request-run'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireClientTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1277 — `POST /api/client-portal/growth/ai-visibility/run`
 *
 * Puerta cliente del run gobernado AEO (EPIC-020). Único entrypoint de portal: delega en el
 * chokepoint `requestGraderRunForOrganization` (entitlement → ventana → allowance → costo).
 *
 * Auth + scope:
 *   - `requireClientTenantContext`: 401 sin sesión / `client_tenant_required` si no es cliente.
 *   - capability `growth.ai_visibility.run.portal` (scope `own`) — el plano fino "puede pedir un
 *     run"; el ACCESO efectivo lo gobierna el chokepoint (módulo per-org + allowance).
 *   - La org se deriva server-side del `tenant.organizationId` (NUNCA del browser).
 *
 * Errores canónicos es-CL (sin leaks): not_entitled / profile_required / quota_exhausted /
 * cost_blocked / run_disabled. Acepta 202 con el handle de poll si el run se encoló.
 */

export const dynamic = 'force-dynamic'

const BLOCK_TO_CANONICAL: Record<RequestRunBlockedReason, CanonicalErrorCode> = {
  disabled: 'aeo_run_disabled',
  not_entitled: 'aeo_not_entitled',
  profile_required: 'aeo_profile_required',
  category_unresolved: 'aeo_category_unresolved',
  quota_exhausted: 'aeo_quota_exhausted',
  cost_blocked: 'aeo_cost_blocked'
}

export async function POST() {
  const { tenant, errorResponse } = await requireClientTenantContext()

  if (!tenant) {
    return errorResponse ?? canonicalErrorResponse('unauthorized')
  }

  if (!can(tenant, 'growth.ai_visibility.run.portal', 'execute', 'own')) {
    return canonicalErrorResponse('forbidden', {
      extra: { requiredCapability: 'growth.ai_visibility.run.portal' }
    })
  }

  const organizationId = tenant.organizationId

  if (!organizationId) {
    captureWithDomain(new Error('client session missing organizationId'), 'client_portal', {
      tags: { source: 'api_endpoint', endpoint: 'growth_ai_visibility_run', stage: 'session_validation' },
      extra: { userId: tenant.userId }
    })

    return canonicalErrorResponse('internal_error', { statusOverride: 500 })
  }

  try {
    const result = await requestGraderRunForOrganization({
      organizationId,
      requestedBy: tenant.userId
    })

    if (result.status === 'blocked') {
      return canonicalErrorResponse(BLOCK_TO_CANONICAL[result.reason])
    }

    return NextResponse.json(
      {
        runId: result.runPublicId,
        pollToken: result.pollToken,
        tier: result.tier,
        allowanceRemaining: result.allowanceRemaining,
        idempotentHit: result.idempotentHit
      },
      { status: 202 }
    )
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'growth_ai_visibility_portal_run_route' },
      extra: { organizationId }
    })

    return canonicalErrorResponse('internal_error', { statusOverride: 502 })
  }
}
