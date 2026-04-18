import { NextResponse } from 'next/server'

import { getGoalCycleById, updateGoalCycle } from '@/lib/hr-goals/postgres-goals-store'
import { requireHrCoreManageTenantContext, HrCoreValidationError, toHrCoreErrorResponse } from '@/lib/hr-core/shared'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'

export const dynamic = 'force-dynamic'

export async function POST(_request: Request, { params }: { params: Promise<{ cycleId: string }> }) {
  const { tenant, errorResponse } = await requireHrCoreManageTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { cycleId } = await params
    const cycle = await getGoalCycleById(cycleId)

    if (!cycle) {
      return NextResponse.json({ error: 'Goal cycle not found.' }, { status: 404 })
    }

    if (cycle.status !== 'active' && cycle.status !== 'review') {
      throw new HrCoreValidationError('Only active or review cycles can be closed.', 409)
    }

    const closed = await updateGoalCycle(cycleId, { status: 'closed' })

    await publishOutboxEvent({
      aggregateType: AGGREGATE_TYPES.goalCycle,
      aggregateId: cycleId,
      eventType: EVENT_TYPES.goalCycleClosed,
      payload: { cycleId, name: cycle.name, previousStatus: cycle.status }
    })

    return NextResponse.json(closed)
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to close goal cycle.')
  }
}
