import { NextResponse } from 'next/server'

import { listGoals, createGoal } from '@/lib/hr-goals/postgres-goals-store'
import { requireHrCoreManageTenantContext, requireHrCoreReadTenantContext, toHrCoreErrorResponse } from '@/lib/hr-core/shared'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireHrCoreReadTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const cycleId = searchParams.get('cycleId')
    const ownerType = searchParams.get('ownerType')
    const ownerId = searchParams.get('ownerId')
    const status = searchParams.get('status')

    const goals = await listGoals({ cycleId, ownerType, ownerId, status })

    return NextResponse.json({ goals })
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to load goals.')
  }
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireHrCoreManageTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null

    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const goal = await createGoal(body)

    await publishOutboxEvent({
      aggregateType: AGGREGATE_TYPES.goal,
      aggregateId: goal.goal_id,
      eventType: EVENT_TYPES.goalCreated,
      payload: { goalId: goal.goal_id, title: goal.title, ownerType: goal.owner_type }
    })

    return NextResponse.json(goal, { status: 201 })
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to create goal.')
  }
}
