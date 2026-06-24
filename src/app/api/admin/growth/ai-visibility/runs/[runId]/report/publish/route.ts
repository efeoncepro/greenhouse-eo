import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { GraderReportError } from '@/lib/growth/ai-visibility/report/command'
import { GraderSnapshotError, publishGraderReportSnapshot } from '@/lib/growth/ai-visibility/report/snapshot'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1239 — `POST /api/admin/growth/ai-visibility/runs/[runId]/report/publish`
 *
 * Congela el snapshot público inmutable del reporte de un run + emite token
 * (EPIC-020 A). Capability `growth.ai_visibility.report.publish`. Idempotente
 * (mismo estado → mismo snapshot). NO publica scores gateados (`review_required`/
 * `insufficient_data`). Body opcional `{ expiresAt?: string }`. La LECTURA pública
 * del snapshot es token-based (otro endpoint, sin sesión).
 */

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: Promise<{ runId: string }> }) {
  const { tenant, memberId, errorResponse } = await requireInternalTenantContext()

  if (!tenant) {
    return errorResponse ?? canonicalErrorResponse('unauthorized')
  }

  if (!can(tenant, 'growth.ai_visibility.report.publish', 'publish', 'tenant')) {
    return canonicalErrorResponse('forbidden', {
      extra: { requiredCapability: 'growth.ai_visibility.report.publish' }
    })
  }

  const { runId } = await params
  const body = (await request.json().catch(() => ({}))) as { expiresAt?: unknown }
  const expiresAt = typeof body.expiresAt === 'string' ? body.expiresAt : null

  try {
    const snapshot = await publishGraderReportSnapshot({ runId, expiresAt, createdBy: memberId })

    return NextResponse.json({
      reportToken: snapshot.reportToken,
      reportId: snapshot.reportId,
      asOf: snapshot.asOf,
      expiresAt: snapshot.expiresAt
    })
  } catch (error) {
    if (error instanceof GraderReportError && (error.code === 'run_not_found' || error.code === 'score_not_found')) {
      return canonicalErrorResponse('internal_error', { statusOverride: 404, extra: { reason: error.code } })
    }

    if (error instanceof GraderSnapshotError && error.code === 'not_releasable') {
      return canonicalErrorResponse('internal_error', { statusOverride: 409, extra: { reason: 'not_releasable' } })
    }

    captureWithDomain(error, 'growth', { tags: { source: 'growth_ai_visibility_report_publish_route' } })

    return canonicalErrorResponse('internal_error', { statusOverride: 502 })
  }
}
