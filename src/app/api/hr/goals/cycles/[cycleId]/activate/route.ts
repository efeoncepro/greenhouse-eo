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

    if (cycle.status !== 'draft') {
      throw new HrCoreValidationError('Only draft cycles can be activated.', 409)
    }

    const activated = await updateGoalCycle(cycleId, { status: 'active' })

    await publishOutboxEvent({
      aggregateType: AGGREGATE_TYPES.goalCycle,
      aggregateId: cycleId,
      eventType: EVENT_TYPES.goalCycleActivated,
      payload: { cycleId, name: cycle.name }
    })

    return NextResponse.json(activated)
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to activate goal cycle.')
  }
}
