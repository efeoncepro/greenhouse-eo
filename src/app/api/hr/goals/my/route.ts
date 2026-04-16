import { NextResponse } from 'next/server'

import { getMyGoals } from '@/lib/hr-goals/postgres-goals-store'
import { resolveGoalAccess } from '@/lib/hr-goals/eligibility'
import { requireTenantContext } from '@/lib/tenant/authorization'
import { toHrCoreErrorResponse } from '@/lib/hr-core/shared'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) {
    return unauthorizedResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const access = await resolveGoalAccess(tenant)

    if (!access.eligible) {
      return NextResponse.json({ error: 'Not eligible for goals module.' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const cycleId = searchParams.get('cycleId')

    const goals = await getMyGoals(access.memberId, cycleId)

    return NextResponse.json({ goals, memberId: access.memberId })
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to load my goals.')
  }
}
