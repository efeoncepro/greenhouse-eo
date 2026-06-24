import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { getGraderRun, getRunObservations } from '@/lib/growth/ai-visibility/store'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1226 — `GET /api/admin/growth/ai-visibility/runs/[runId]`
 *
 * Detalle de un run + sus observaciones normalizadas (evidence ledger).
 * Capability `growth.ai_visibility.observation.read`. Delega en el store.
 */

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ runId: string }> }) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) {
    return errorResponse ?? canonicalErrorResponse('unauthorized')
  }

  if (!can(tenant, 'growth.ai_visibility.observation.read', 'read', 'tenant')) {
    return canonicalErrorResponse('forbidden', {
      extra: { requiredCapability: 'growth.ai_visibility.observation.read' }
    })
  }

  const { runId } = await params

  try {
    const run = await getGraderRun(runId)

    if (!run) {
      return canonicalErrorResponse('internal_error', { statusOverride: 404, extra: { reason: 'run_not_found' } })
    }

    const observations = await getRunObservations(runId)

    return NextResponse.json({ run, observations, observationCount: observations.length })
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'growth_ai_visibility_run_detail_route' } })

    return canonicalErrorResponse('internal_error', { statusOverride: 502 })
  }
}
