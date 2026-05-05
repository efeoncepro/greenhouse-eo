import { NextResponse } from 'next/server'

import { can } from '@/lib/entitlements/runtime'
import { requireHrCoreReadTenantContext } from '@/lib/hr-core/shared'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import { listPendingRoleTitleDriftProposals } from '@/lib/workforce/role-title'

export const dynamic = 'force-dynamic'

/**
 * TASK-785 — GET /api/hr/workforce/role-title-drift
 *
 * Capability: `workforce.role_title.review_drift` (HR + EFEONCE_ADMIN).
 * Returns pending drift proposals (members.role_title vs Entra job_title)
 * for HR review queue.
 */
export async function GET() {
  const { tenant, errorResponse: authErr } = await requireHrCoreReadTenantContext()

  if (!tenant || authErr) {
    return authErr ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!can(tenant, 'workforce.role_title.review_drift', 'read', 'tenant')) {
    return NextResponse.json(
      { error: 'Capability missing: workforce.role_title.review_drift', code: 'forbidden' },
      { status: 403 }
    )
  }

  try {
    const proposals = await listPendingRoleTitleDriftProposals()

    return NextResponse.json({
      proposals,
      count: proposals.length
    })
  } catch (error) {
    captureWithDomain(error, 'identity', {
      extra: { route: 'hr/workforce/role-title-drift', method: 'GET' }
    })

    return NextResponse.json(
      { error: redactErrorForResponse(error), code: 'internal_error' },
      { status: 500 }
    )
  }
}
