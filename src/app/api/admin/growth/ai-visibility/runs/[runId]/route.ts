import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { readGraderScore } from '@/lib/growth/ai-visibility/scoring/command'
import { getGraderRun, getRunObservations } from '@/lib/growth/ai-visibility/store'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1226/1227 — `GET /api/admin/growth/ai-visibility/runs/[runId]`
 *
 * Detalle de un run + observaciones (evidence ledger) + findings normalizados +
 * grader_score persistido (TASK-1227). Capability `growth.ai_visibility.observation.read`.
 * Delega en los primitives (store + scoring reader); sin lógica ad-hoc. Sin ruta pública.
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
      return canonicalErrorResponse('grader_run_not_found', { extra: { reason: 'run_not_found' } })
    }

    const observations = await getRunObservations(runId)
    const { score, findings } = await readGraderScore(runId)

    return NextResponse.json({
      run,
      observations,
      observationCount: observations.length,
      findings,
      findingCount: findings.length,
      score
    })
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'growth_ai_visibility_run_detail_route' } })

    return canonicalErrorResponse('internal_error', { statusOverride: 502 })
  }
}
