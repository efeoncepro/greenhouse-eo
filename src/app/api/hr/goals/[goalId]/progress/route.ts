import { NextResponse } from 'next/server'

import { getGoalById, recordProgress, getProgressHistory, updateGoal } from '@/lib/hr-goals/postgres-goals-store'
import { calculateGoalProgress } from '@/lib/hr-goals/progress-calculator'
import { requireHrCoreManageTenantContext, requireHrCoreReadTenantContext, toHrCoreErrorResponse } from '@/lib/hr-core/shared'
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
    const history = await getProgressHistory(goalId)

    return NextResponse.json({ goalId, history })
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to load progress history.')
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ goalId: string }> }) {
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

    const entry = await recordProgress(goalId, body)

    const goal = await getGoalById(goalId)
    const hasKeyResults = goal?.key_results && goal.key_results.length > 0

    if (hasKeyResults) {
      const progressPercent = calculateGoalProgress(goal.key_results)

      await updateGoal(goalId, { progress_percent: progressPercent })
    }

    await publishOutboxEvent({
      aggregateType: AGGREGATE_TYPES.goal,
      aggregateId: goalId,
      eventType: EVENT_TYPES.goalProgressRecorded,
      payload: { goalId, progressEntryId: entry.progress_entry_id }
    })

    return NextResponse.json(entry, { status: 201 })
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to record progress.')
  }
}
