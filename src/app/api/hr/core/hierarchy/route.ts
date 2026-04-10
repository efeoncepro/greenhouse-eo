import { NextResponse } from 'next/server'

import { listHierarchy } from '@/lib/reporting-hierarchy/admin'
import { requireHrCoreManageTenantContext, toHrCoreErrorResponse } from '@/lib/hr-core/shared'
import type { HrHierarchyResponse } from '@/types/hr-core'

export const dynamic = 'force-dynamic'

const buildSummary = (items: HrHierarchyResponse['items']): HrHierarchyResponse['summary'] => ({
  total: items.length,
  active: items.filter(item => item.memberActive).length,
  roots: items.filter(item => item.isRoot).length,
  withoutSupervisor: items.filter(item => !item.supervisorMemberId).length,
  delegatedApprovals: items.filter(item => item.delegation).length
})

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireHrCoreManageTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)

    const items = await listHierarchy({
      memberId: searchParams.get('memberId'),
      supervisorMemberId: searchParams.get('supervisorMemberId'),
      departmentId: searchParams.get('departmentId'),
      search: searchParams.get('search'),
      includeInactive: searchParams.get('includeInactive') === 'true',
      withoutSupervisor: searchParams.get('withoutSupervisor') === 'true'
    })

    const payload: HrHierarchyResponse = {
      items,
      summary: buildSummary(items)
    }

    return NextResponse.json(payload)
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to load hierarchy.')
  }
}
