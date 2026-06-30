import { NextResponse } from 'next/server'

import { canonicalErrorResponse, type CanonicalErrorCode } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import {
  requestGraderRunAsOperator,
  type RequestRunBlockedReason
} from '@/lib/growth/ai-visibility/request-run'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1277 — `POST /api/admin/growth/ai-visibility/operator-run`
 *
 * Puerta operador (4.ª) del run gobernado AEO: Growth/AM corre el motor sobre cualquier cliente
 * o prospecto (subject org) como jugada de venta — ILIMITADO (sin allowance), costo a "sales".
 * Habilita el cross-sell de TASK-1276/1279. Delega en el chokepoint `requestGraderRunAsOperator`.
 *
 * Auth dual-gate: requireInternalTenantContext (clientes excluidos) + capability
 * `growth.ai_visibility.run.operator` (efeonce_account/admin/operations/ai_tooling_admin).
 */

export const dynamic = 'force-dynamic'

const BLOCK_TO_CANONICAL: Record<RequestRunBlockedReason, CanonicalErrorCode> = {
  disabled: 'aeo_run_disabled',
  not_entitled: 'aeo_not_entitled',
  profile_required: 'aeo_profile_required',
  category_unresolved: 'aeo_category_unresolved',
  business_model_unconfirmed: 'aeo_business_model_unconfirmed',
  quota_exhausted: 'aeo_quota_exhausted',
  cost_blocked: 'aeo_cost_blocked'
}

interface OperatorRunBody {
  subjectOrganizationId?: unknown
  idempotencyKey?: unknown
}

const asNonEmptyString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) {
    return errorResponse ?? canonicalErrorResponse('unauthorized')
  }

  if (!can(tenant, 'growth.ai_visibility.run.operator', 'execute', 'tenant')) {
    return canonicalErrorResponse('forbidden', {
      extra: { requiredCapability: 'growth.ai_visibility.run.operator' }
    })
  }

  let body: OperatorRunBody

  try {
    body = (await request.json()) as OperatorRunBody
  } catch {
    return canonicalErrorResponse('grader_run_invalid_input', { extra: { reason: 'invalid_json' } })
  }

  const subjectOrganizationId = asNonEmptyString(body.subjectOrganizationId)

  if (!subjectOrganizationId) {
    return canonicalErrorResponse('grader_run_invalid_input', {
      extra: { reason: 'missing_required_fields', required: ['subjectOrganizationId'] }
    })
  }

  try {
    const result = await requestGraderRunAsOperator({
      subjectOrganizationId,
      requestedBy: tenant.userId,
      idempotencyKey: asNonEmptyString(body.idempotencyKey)
    })

    if (result.status === 'blocked') {
      return canonicalErrorResponse(BLOCK_TO_CANONICAL[result.reason])
    }

    return NextResponse.json(
      {
        runId: result.runPublicId,
        pollToken: result.pollToken,
        tier: result.tier,
        idempotentHit: result.idempotentHit
      },
      { status: 202 }
    )
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'growth_ai_visibility_operator_run_route' },
      extra: { subjectOrganizationId }
    })

    return canonicalErrorResponse('internal_error', { statusOverride: 502 })
  }
}
