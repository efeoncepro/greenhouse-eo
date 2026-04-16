import { NextResponse } from 'next/server'

import { getCompanyGoals } from '@/lib/hr-goals/postgres-goals-store'
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

    const goals = await getCompanyGoals(cycleId)

    return NextResponse.json({ goals })
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to load company goals.')
  }
}
