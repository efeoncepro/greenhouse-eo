import { NextResponse } from 'next/server'

import { runEntraHierarchyGovernanceScan } from '@/lib/reporting-hierarchy/governance'
import { requireHrCoreManageTenantContext, toHrCoreErrorResponse } from '@/lib/hr-core/shared'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST() {
  const { tenant, errorResponse } = await requireHrCoreManageTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runEntraHierarchyGovernanceScan({
      triggeredBy: `manual:${tenant.userId}`,
      syncMode: 'manual'
    })

    return NextResponse.json(result)
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to run hierarchy governance scan.')
  }
}
