import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import { toContractorEngagementErrorResponse } from '@/lib/contractor-engagements/error-response'
import { resolveContractorHrWorkbenchProjection } from '@/lib/contractor-engagements/hr-workbench-projection'
import { can } from '@/lib/entitlements/runtime'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireHrTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

/**
 * TASK-796 — `/api/hr/contractors/workbench` (HR/admin, tenant-scoped).
 *
 * GET → aggregated HR review queue projection: engagements pending review +
 *       submitted/disputed work submissions + blocked/ready/paid payables, with
 *       honestly-derived operational signals. The granular CRUD stays on the
 *       existing `/api/hr/contractors/*` + `/api/finance/contractor-payables/*`
 *       endpoints (TASK-790/792/793); this is the read-only workbench composer.
 *
 * Reuses the existing read capability `hr.contractor_work_submission:read:tenant`.
 */
export async function GET() {
  const { tenant, errorResponse } = await requireHrTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  const subject = buildTenantEntitlementSubject(tenant)

  if (!can(subject, 'hr.contractor_work_submission', 'read', 'tenant')) {
    return canonicalErrorResponse('forbidden')
  }

  try {
    const projection = await resolveContractorHrWorkbenchProjection()

    return NextResponse.json(projection)
  } catch (error) {
    captureWithDomain(error, 'identity', {
      tags: { source: 'contractor_hr_workbench_api', stage: 'GET' }
    })

    return toContractorEngagementErrorResponse(error)
  }
}
