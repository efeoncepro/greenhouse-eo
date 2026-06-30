import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { GraderReportError } from '@/lib/growth/ai-visibility/report/command'
import { rejectAiVisibilityReport } from '@/lib/growth/ai-visibility/review/commands'
import { ReportReviewError } from '@/lib/growth/ai-visibility/review/state'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1244 — `POST /api/admin/growth/ai-visibility/runs/[runId]/review/reject`
 *
 * Rechaza (gate humano YMYL) un reporte `review_required`: lo deja `unavailable` (final
 * honesto, NUNCA se publica). Capability `growth.ai_visibility.report.review`. Body
 * `{ reason: string }` OBLIGATORIO (motivo del rechazo → audit interno). `reason_required`
 * → 422; `not_reviewable`/`invalid_transition` → 409. Full API parity: delega en el command.
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
  const reason = typeof body.reason === 'string' ? body.reason : ''

  try {
    const result = await rejectAiVisibilityReport({ runId, reviewedByUserId: tenant.userId, reason })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof GraderReportError && (error.code === 'run_not_found' || error.code === 'score_not_found')) {
      return canonicalErrorResponse('grader_run_not_found', { extra: { reason: error.code } })
    }

    if (error instanceof ReportReviewError) {
      const code =
        error.code === 'reason_required'
          ? 'grader_report_review_reason_required'
          : error.code === 'not_reviewable'
            ? 'grader_report_not_reviewable'
            : 'grader_report_invalid_review_transition'

      return canonicalErrorResponse(code, { extra: { reason: error.code } })
    }

    captureWithDomain(error, 'growth', {
      tags: { source: 'growth_ai_visibility_report_review_reject_route' },
      extra: { runId }
    })

    return canonicalErrorResponse('internal_error', { statusOverride: 502 })
  }
}
