import { NextResponse } from 'next/server'

import { listGoalCycles, createGoalCycle } from '@/lib/hr-goals/postgres-goals-store'
import { requireHrCoreManageTenantContext, requireHrCoreReadTenantContext, toHrCoreErrorResponse } from '@/lib/hr-core/shared'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenant, errorResponse } = await requireHrCoreReadTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const cycles = await listGoalCycles()

    return NextResponse.json({ cycles })
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to load goal cycles.')
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

    const cycle = await createGoalCycle(body)

    return NextResponse.json(cycle, { status: 201 })
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to create goal cycle.')
  }
}
