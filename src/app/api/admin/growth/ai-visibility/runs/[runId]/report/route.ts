import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { GraderReportError, readGraderReport } from '@/lib/growth/ai-visibility/report/command'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1235 — `GET /api/admin/growth/ai-visibility/runs/[runId]/report`
 *
 * Construye el `grader_report` (§7.7) on-read desde el score+findings persistidos
 * (TASK-1227). Capability `growth.ai_visibility.report.read` (least-privilege: ver
 * el reporte sin la evidencia cruda de provider). Devuelve el reporte INTERNO
 * completo + el DTO PÚBLICO public-safe. Delega en el builder; sin lógica ad-hoc.
 * Sin ruta pública (admin interno; la superficie pública es una task posterior).
 */

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ runId: string }> }) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) {
    return errorResponse ?? canonicalErrorResponse('unauthorized')
  }

  if (!can(tenant, 'growth.ai_visibility.report.read', 'read', 'tenant')) {
    return canonicalErrorResponse('forbidden', {
      extra: { requiredCapability: 'growth.ai_visibility.report.read' }
    })
  }

  const { runId } = await params

  try {
    const { report, publicReport } = await readGraderReport({ runId })

    return NextResponse.json({ report, publicReport })
  } catch (error) {
    if (
      error instanceof GraderReportError &&
      (error.code === 'run_not_found' || error.code === 'score_not_found')
    ) {
      return canonicalErrorResponse('internal_error', { statusOverride: 404, extra: { reason: error.code } })
    }

    captureWithDomain(error, 'growth', { tags: { source: 'growth_ai_visibility_report_route' } })

    return canonicalErrorResponse('internal_error', { statusOverride: 502 })
  }
}
