import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { GraderReportError } from '@/lib/growth/ai-visibility/report/command'
import { approveAiVisibilityReport } from '@/lib/growth/ai-visibility/review/commands'
import { ReportReviewError } from '@/lib/growth/ai-visibility/review/state'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1244 — `POST /api/admin/growth/ai-visibility/runs/[runId]/review/approve`
 *
 * Aprueba (gate humano YMYL) un reporte `review_required` y lo publica (snapshot TASK-1239 +
 * delivery 'ready'). Capability `growth.ai_visibility.report.review`. Body opcional
 * `{ reason?: string }` (nota interna). El LLM nunca aprueba: este endpoint ES el punto de
 * confirmación humana. Idempotente. Full API parity: delega en el command canónico.
 */

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: Promise<{ runId: string }> }) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) {
    return errorResponse ?? canonicalErrorResponse('unauthorized')
  }

  if (!can(tenant, 'growth.ai_visibility.report.review', 'execute', 'tenant')) {
    return canonicalErrorResponse('forbidden', {
      extra: { requiredCapability: 'growth.ai_visibility.report.review' }
    })
  }

  const { runId } = await params
  const body = (await request.json().catch(() => ({}))) as { reason?: unknown }
  const reason = typeof body.reason === 'string' ? body.reason : null

  try {
    const result = await approveAiVisibilityReport({ runId, reviewedByUserId: tenant.userId, reason })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof GraderReportError && (error.code === 'run_not_found' || error.code === 'score_not_found')) {
      return canonicalErrorResponse('grader_report_not_found', { extra: { reason: error.code } })
    }

    if (error instanceof ReportReviewError) {
      // not_reviewable / invalid_transition: estructurales (actionable=false). reason_required
      // no aplica a approve (sin reason obligatoria) pero se mapea por completitud.
      const code =
        error.code === 'not_reviewable'
          ? 'grader_report_not_reviewable'
          : error.code === 'reason_required'
            ? 'grader_report_review_reason_required'
            : 'grader_report_invalid_review_transition'

      return canonicalErrorResponse(code, { extra: { reason: error.code } })
    }

    captureWithDomain(error, 'growth', {
      tags: { source: 'growth_ai_visibility_report_review_approve_route' },
      extra: { runId }
    })

    return canonicalErrorResponse('internal_error', { statusOverride: 502 })
  }
}
