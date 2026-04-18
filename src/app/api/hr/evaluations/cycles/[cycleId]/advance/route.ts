import { NextResponse } from 'next/server'

import { advanceCyclePhase } from '@/lib/hr-evals/postgres-evals-store'
import { requireHrCoreManageTenantContext, toHrCoreErrorResponse } from '@/lib/hr-core/shared'

export const dynamic = 'force-dynamic'

export async function POST(_: Request, { params }: { params: Promise<{ cycleId: string }> }) {
  const { tenant, errorResponse } = await requireHrCoreManageTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { cycleId } = await params
    const cycle = await advanceCyclePhase(cycleId)

    return NextResponse.json(cycle)
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to advance cycle phase.')
  }
}
