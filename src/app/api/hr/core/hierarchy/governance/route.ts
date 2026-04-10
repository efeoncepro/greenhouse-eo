import { NextResponse } from 'next/server'

import {
  getHierarchyGovernanceOverview
} from '@/lib/reporting-hierarchy/governance'
import { requireHrCoreManageTenantContext, toHrCoreErrorResponse } from '@/lib/hr-core/shared'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireHrCoreManageTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || '20'), 1), 100)
    const payload = await getHierarchyGovernanceOverview(limit)

    return NextResponse.json(payload)
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to load hierarchy governance overview.')
  }
}
