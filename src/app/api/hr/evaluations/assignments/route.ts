import { NextResponse } from 'next/server'

import { listAssignments } from '@/lib/hr-evals/postgres-evals-store'
import { requireHrCoreReadTenantContext, toHrCoreErrorResponse } from '@/lib/hr-core/shared'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireHrCoreReadTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const cycleId = searchParams.get('cycleId')

    if (!cycleId) {
      return NextResponse.json({ error: 'cycleId query parameter is required' }, { status: 400 })
    }

    const filters = {
      cycleId,
      evaluateeId: searchParams.get('evaluateeId') ?? undefined,
      evaluatorId: searchParams.get('evaluatorId') ?? undefined,
      evalType: searchParams.get('evalType') ?? undefined
    }

    const assignments = await listAssignments(filters)

    return NextResponse.json({ assignments })
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to load assignments.')
  }
}
