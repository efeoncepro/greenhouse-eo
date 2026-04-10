import { NextResponse } from 'next/server'

import {
  listApprovalDelegations,
  listHierarchyHistory
} from '@/lib/reporting-hierarchy/admin'
import { requireHrCoreManageTenantContext, toHrCoreErrorResponse } from '@/lib/hr-core/shared'
import type { HrHierarchyDelegationRecord, HrHierarchyHistoryResponse } from '@/types/hr-core'

export const dynamic = 'force-dynamic'

const dedupeDelegations = (rows: HrHierarchyDelegationRecord[]) => {
  const map = new Map<string, HrHierarchyDelegationRecord>()

  for (const row of rows) {
    map.set(row.responsibilityId, row)
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )
}

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireHrCoreManageTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get('memberId')
    const supervisorMemberId = searchParams.get('supervisorMemberId')

    const history = await listHierarchyHistory({
      memberId,
      supervisorMemberId,
      limit: Number(searchParams.get('limit') || '80')
    })

    const delegationSlices: HrHierarchyDelegationRecord[][] = []

    if (supervisorMemberId) {
      delegationSlices.push(
        await listApprovalDelegations({
          supervisorMemberId,
          includeInactive: true
        })
      )
    } else if (memberId) {
      delegationSlices.push(
        await listApprovalDelegations({
          supervisorMemberId: memberId,
          includeInactive: true
        })
      )
      delegationSlices.push(
        await listApprovalDelegations({
          delegateMemberId: memberId,
          includeInactive: true
        })
      )
    } else {
      delegationSlices.push(
        await listApprovalDelegations({
          includeInactive: true
        })
      )
    }

    const payload: HrHierarchyHistoryResponse = {
      history,
      delegations: dedupeDelegations(delegationSlices.flat())
    }

    return NextResponse.json(payload)
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to load hierarchy history.')
  }
}
