import { NextResponse } from 'next/server'

import { getDepartmentGoals } from '@/lib/hr-goals/postgres-goals-store'
import { requireHrCoreReadTenantContext, toHrCoreErrorResponse } from '@/lib/hr-core/shared'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ deptId: string }> }
) {
  const { tenant, errorResponse } = await requireHrCoreReadTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { deptId } = await params
    const { searchParams } = new URL(request.url)
    const cycleId = searchParams.get('cycleId')

    const goals = await getDepartmentGoals(deptId, cycleId)

    return NextResponse.json({ goals, departmentId: deptId })
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to load department goals.')
  }
}
