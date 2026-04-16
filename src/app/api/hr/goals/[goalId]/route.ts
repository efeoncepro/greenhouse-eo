import { NextResponse } from 'next/server'

import { getGoalById, updateGoal, deleteGoal } from '@/lib/hr-goals/postgres-goals-store'
import { requireHrCoreManageTenantContext, requireHrCoreReadTenantContext, HrCoreValidationError, toHrCoreErrorResponse } from '@/lib/hr-core/shared'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ goalId: string }> }) {
  const { tenant, errorResponse } = await requireHrCoreReadTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { goalId } = await params
    const goal = await getGoalById(goalId)

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found.' }, { status: 404 })
    }

    return NextResponse.json(goal)
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to load goal detail.')
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ goalId: string }> }) {
  const { tenant, errorResponse } = await requireHrCoreManageTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { goalId } = await params
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null

    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const updated = await updateGoal(goalId, body)

    await publishOutboxEvent({
      aggregateType: AGGREGATE_TYPES.goal,
      aggregateId: goalId,
      eventType: EVENT_TYPES.goalUpdated,
      payload: { goalId, changes: Object.keys(body) }
    })

    return NextResponse.json(updated)
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to update goal.')
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ goalId: string }> }) {
  const { tenant, errorResponse } = await requireHrCoreManageTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { goalId } = await params
    const goal = await getGoalById(goalId)

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found.' }, { status: 404 })
    }

    if (goal.cycle_status !== 'draft') {
      throw new HrCoreValidationError('Goals can only be deleted while the cycle is in draft status.', 409)
    }

    await deleteGoal(goalId)

    return NextResponse.json({ deleted: true, goalId })
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to delete goal.')
  }
}
