import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import {
  RecommendationStatusError,
  readRecommendationStatuses,
  setRecommendationStatus
} from '@/lib/growth/ai-visibility/recommendation-status'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1275 — `/api/admin/growth/ai-visibility/recommendation-status`
 *
 * Superficie de parity del estado de ejecución del Plan AEO (operador interno).
 * - POST: registra el avance de un foco (command gobernado `setRecommendationStatus`).
 * - GET:  lee el status por org (reader `readRecommendationStatuses`).
 * El primitive vive en `src/lib/growth/ai-visibility/recommendation-status.ts`; esta route sólo
 * aplica tenant/capability + error contract. Cockpit operador (TASK-1276), Nexa y MCP consumen
 * el MISMO primitive.
 */

export const dynamic = 'force-dynamic'

const CAPABILITY = 'growth.ai_visibility.recommendation.set_status'

const asNonEmptyString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null

interface SetStatusBody {
  organizationId?: unknown
  recommendationKey?: unknown
  status?: unknown
  sourceRunId?: unknown
  reason?: unknown
}

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) {
    return errorResponse ?? canonicalErrorResponse('unauthorized')
  }

  if (!can(tenant, CAPABILITY, 'execute', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: CAPABILITY } })
  }

  const organizationId = asNonEmptyString(new URL(request.url).searchParams.get('organizationId'))

  if (!organizationId) {
    return canonicalErrorResponse('recommendation_status_invalid_input', {
      extra: { reason: 'missing_organization_id' }
    })
  }

  try {
    const statuses = await readRecommendationStatuses(organizationId)

    return NextResponse.json({ organizationId, statuses })
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'growth_ai_visibility_recommendation_status_get' },
      extra: { organizationId }
    })

    return canonicalErrorResponse('internal_error', { statusOverride: 502 })
  }
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) {
    return errorResponse ?? canonicalErrorResponse('unauthorized')
  }

  if (!can(tenant, CAPABILITY, 'execute', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: CAPABILITY } })
  }

  let body: SetStatusBody

  try {
    body = (await request.json()) as SetStatusBody
  } catch {
    return canonicalErrorResponse('recommendation_status_invalid_input', { extra: { reason: 'invalid_json' } })
  }

  const organizationId = asNonEmptyString(body.organizationId)
  const recommendationKey = asNonEmptyString(body.recommendationKey)
  const status = asNonEmptyString(body.status)

  if (!organizationId || !recommendationKey || !status) {
    return canonicalErrorResponse('recommendation_status_invalid_input', {
      extra: { reason: 'missing_required_fields', required: ['organizationId', 'recommendationKey', 'status'] }
    })
  }

  try {
    const result = await setRecommendationStatus({
      subject: tenant,
      organizationId,
      recommendationKey,
      status,
      sourceRunId: asNonEmptyString(body.sourceRunId),
      updatedBy: tenant.userId,
      reason: asNonEmptyString(body.reason)
    })

    return NextResponse.json(
      { changed: result.changed, status: result.status },
      { status: result.changed ? 202 : 200 }
    )
  } catch (error) {
    if (error instanceof RecommendationStatusError) {
      if (error.code === 'forbidden') {
        return canonicalErrorResponse('forbidden', { extra: { requiredCapability: CAPABILITY } })
      }

      return canonicalErrorResponse('recommendation_status_invalid_input', { extra: { reason: error.code } })
    }

    captureWithDomain(error, 'growth', {
      tags: { source: 'growth_ai_visibility_recommendation_status_post' },
      extra: { organizationId, recommendationKey }
    })

    return canonicalErrorResponse('internal_error', { statusOverride: 502 })
  }
}
