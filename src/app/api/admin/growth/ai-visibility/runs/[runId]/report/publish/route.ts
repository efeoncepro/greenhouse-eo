import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { syncAiVisibilityRunToHubSpot } from '@/lib/growth/ai-visibility/hubspot/command'
import { requestAiVisibilityReportEmail } from '@/lib/growth/ai-visibility/public-delivery/email/request-report-email'
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
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) {
    return errorResponse ?? canonicalErrorResponse('unauthorized')
  }

  if (!can(tenant, 'growth.ai_visibility.report.publish', 'execute', 'tenant')) {
    return canonicalErrorResponse('forbidden', {
      extra: { requiredCapability: 'growth.ai_visibility.report.publish' }
    })
  }

  const { runId } = await params
  const body = (await request.json().catch(() => ({}))) as { expiresAt?: unknown }
  const expiresAt = typeof body.expiresAt === 'string' ? body.expiresAt : null

  try {
    const snapshot = await publishGraderReportSnapshot({ runId, expiresAt, createdBy: tenant.userId })

    // TASK-1242 — Auto-trigger del HubSpot lead handoff: el snapshot publicado significa
    // score releasable (gate `completed`) + report_url disponible. ENQUEUE gobernado (no
    // write inline); el reactive consumer hace el upsert. No-fatal: un fallo del enqueue no
    // rompe la publicación (el lead queda detectable por el signal `lead_handoff_uncovered`).
    try {
      await syncAiVisibilityRunToHubSpot({ runId, trigger: 'report_published' })
    } catch (handoffError) {
      captureWithDomain(handoffError, 'growth', {
        tags: { source: 'growth_ai_visibility_report_publish_route', stage: 'lead_handoff_enqueue' },
        extra: { runId }
      })
    }

    // TASK-1250 — paridad: el snapshot publicado también dispara el email de entrega al lead
    // (enqueue gobernado). No-fatal: un fallo del enqueue no rompe la publicación.
    try {
      await requestAiVisibilityReportEmail({ runId, trigger: 'report_published' })
    } catch (emailError) {
      captureWithDomain(emailError, 'growth', {
        tags: { source: 'growth_ai_visibility_report_publish_route', stage: 'report_email_enqueue' },
        extra: { runId }
      })
    }

    return NextResponse.json({
      reportToken: snapshot.reportToken,
      reportId: snapshot.reportId,
      asOf: snapshot.asOf,
      expiresAt: snapshot.expiresAt
    })
  } catch (error) {
    if (error instanceof GraderReportError && (error.code === 'run_not_found' || error.code === 'score_not_found')) {
      return canonicalErrorResponse('grader_run_not_found', { extra: { reason: error.code } })
    }

    if (error instanceof GraderSnapshotError && error.code === 'not_releasable') {
      return canonicalErrorResponse('grader_report_not_releasable', { extra: { reason: 'not_releasable' } })
    }

    captureWithDomain(error, 'growth', { tags: { source: 'growth_ai_visibility_report_publish_route' } })

    return canonicalErrorResponse('internal_error', { statusOverride: 502 })
  }
}
