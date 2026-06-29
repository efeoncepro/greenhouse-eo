import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { AssignAeoTierValidationError, assignAeoTier } from '@/lib/growth/ai-visibility/assign-tier'
import { ProvisionGraderProfileError } from '@/lib/growth/ai-visibility/provision-profile'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1286 — `POST /api/admin/growth/ai-visibility/assign-tier`
 *
 * Command gobernado para asignar/cambiar/superseder tiers AEO por organización.
 * Full API parity: cockpit operador, Account-360 y Nexa consumen el mismo primitive
 * `assignAeoTier`; esta route sólo aplica tenant/capability + error contract.
 */

export const dynamic = 'force-dynamic'

interface AssignTierBody {
  organizationId?: unknown
  tier?: unknown
  reason?: unknown
  expiresAt?: unknown
}

const asNonEmptyString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) {
    return errorResponse ?? canonicalErrorResponse('unauthorized')
  }

  if (!can(tenant, 'growth.ai_visibility.entitlement.manage', 'execute', 'tenant')) {
    return canonicalErrorResponse('forbidden', {
      extra: { requiredCapability: 'growth.ai_visibility.entitlement.manage' }
    })
  }

  let body: AssignTierBody

  try {
    body = (await request.json()) as AssignTierBody
  } catch {
    return canonicalErrorResponse('aeo_assignment_invalid_input', {
      extra: { reason: 'invalid_json' }
    })
  }

  const organizationId = asNonEmptyString(body.organizationId)
  const reason = asNonEmptyString(body.reason)

  if (!organizationId || !reason) {
    return canonicalErrorResponse('aeo_assignment_invalid_input', {
      extra: { reason: 'missing_required_fields', required: ['organizationId', 'tier', 'reason'] }
    })
  }

  const expiresAt = asNonEmptyString(body.expiresAt)

  try {
    const result = await assignAeoTier({
      organizationId,
      tier: body.tier as never,
      reason,
      requestedBy: tenant.userId,
      expiresAt
    })

    return NextResponse.json(
      {
        organizationId: result.organizationId,
        tier: result.tier,
        assignmentId: result.assignmentId,
        status: result.status,
        idempotent: result.idempotent,
        supersededAssignmentId: result.supersededAssignmentId,
        profile: result.profile
          ? {
              profileId: result.profile.profileId,
              publicId: result.profile.publicId,
              idempotent: result.profile.idempotent
            }
          : null
      },
      { status: result.idempotent ? 200 : 202 }
    )
  } catch (error) {
    if (error instanceof AssignAeoTierValidationError) {
      return canonicalErrorResponse(
        error.code === 'invalid_tier'
          ? 'aeo_assignment_invalid_tier'
          : 'aeo_assignment_invalid_input',
        { extra: error.details }
      )
    }

    if (error instanceof ProvisionGraderProfileError) {
      return canonicalErrorResponse(
        error.code === 'website_required'
          ? 'aeo_assignment_website_required'
          : 'aeo_assignment_org_not_found',
        { extra: error.details }
      )
    }

    captureWithDomain(error, 'growth', {
      tags: { source: 'growth_ai_visibility_assign_tier_route' },
      extra: { organizationId }
    })

    return canonicalErrorResponse('internal_error', { statusOverride: 502 })
  }
}
