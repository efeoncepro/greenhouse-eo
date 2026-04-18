import { NextResponse } from 'next/server'

import { getGoalCycleById, updateGoalCycle } from '@/lib/hr-goals/postgres-goals-store'
import { requireHrCoreManageTenantContext, requireHrCoreReadTenantContext, toHrCoreErrorResponse } from '@/lib/hr-core/shared'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ cycleId: string }> }) {
  const { tenant, errorResponse } = await requireHrCoreReadTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { cycleId } = await params
    const cycle = await getGoalCycleById(cycleId)

    if (!cycle) {
      return NextResponse.json({ error: 'Goal cycle not found.' }, { status: 404 })
    }

    return NextResponse.json(cycle)
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to load goal cycle detail.')
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ cycleId: string }> }) {
  const { tenant, errorResponse } = await requireHrCoreManageTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { cycleId } = await params
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null

    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const updated = await updateGoalCycle(cycleId, body)

    return NextResponse.json(updated)
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to update goal cycle.')
  }
}
