import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { GraderScoringError, scoreGraderRun } from '@/lib/growth/ai-visibility/scoring/command'
import { toPublicSafeScore } from '@/lib/growth/ai-visibility/scoring/dto'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1227 — `POST /api/admin/growth/ai-visibility/runs/[runId]/score`
 *
 * Normaliza + puntúa un run (primitive `scoreGraderRun`). Capability
 * `growth.ai_visibility.run.execute`. Idempotente (recompute reemplaza). Devuelve
 * la vista interna completa + el DTO public-safe. NO es ruta pública (admin interno).
 */

export const dynamic = 'force-dynamic'

export async function POST(_request: Request, { params }: { params: Promise<{ runId: string }> }) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) {
    return errorResponse ?? canonicalErrorResponse('unauthorized')
  }

  if (!can(tenant, 'growth.ai_visibility.run.execute', 'execute', 'tenant')) {
    return canonicalErrorResponse('forbidden', {
      extra: { requiredCapability: 'growth.ai_visibility.run.execute' }
    })
  }

  const { runId } = await params

  try {
    const { score, findings } = await scoreGraderRun({ runId })

    return NextResponse.json({
      score,
      findingCount: findings.length,
      publicSafe: toPublicSafeScore(score)
    })
  } catch (error) {
    if (error instanceof GraderScoringError && (error.code === 'run_not_found' || error.code === 'profile_not_found')) {
      return canonicalErrorResponse('internal_error', { statusOverride: 404, extra: { reason: error.code } })
    }

    captureWithDomain(error, 'growth', { tags: { source: 'growth_ai_visibility_score_route' } })

    return canonicalErrorResponse('internal_error', { statusOverride: 502 })
  }
}
