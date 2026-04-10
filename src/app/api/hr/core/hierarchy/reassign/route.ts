import { NextResponse } from 'next/server'

import {
  bulkReassignDirectReports,
  changeHierarchySupervisor
} from '@/lib/reporting-hierarchy/admin'
import { HrCoreValidationError, requireHrCoreManageTenantContext, toHrCoreErrorResponse } from '@/lib/hr-core/shared'

export const dynamic = 'force-dynamic'

type ReassignRequestBody =
  | {
      mode?: 'single'
      memberId?: string
      supervisorMemberId?: string | null
      reason?: string
      effectiveFrom?: string | null
    }
  | {
      mode: 'direct_reports'
      currentSupervisorMemberId?: string
      supervisorMemberId?: string | null
      reason?: string
      effectiveFrom?: string | null
    }

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireHrCoreManageTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await request.json().catch(() => null)) as ReassignRequestBody | null

    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    if (body.mode === 'direct_reports') {
      if (!body.currentSupervisorMemberId) {
        throw new HrCoreValidationError('currentSupervisorMemberId is required.')
      }

      const result = await bulkReassignDirectReports({
        currentSupervisorMemberId: body.currentSupervisorMemberId,
        nextSupervisorMemberId: body.supervisorMemberId ?? null,
        actorUserId: tenant.userId,
        reason: body.reason || '',
        effectiveFrom: body.effectiveFrom
      })

      return NextResponse.json(result)
    }

    const item = await changeHierarchySupervisor({
      memberId: body.memberId || '',
      supervisorMemberId: body.supervisorMemberId ?? null,
      actorUserId: tenant.userId,
      reason: body.reason || '',
      effectiveFrom: body.effectiveFrom
    })

    return NextResponse.json(item)
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to reassign hierarchy.')
  }
}
