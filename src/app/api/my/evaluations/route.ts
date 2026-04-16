import { NextResponse } from 'next/server'

import { listAssignments, listEvalSummaries } from '@/lib/hr-evals/postgres-evals-store'
import { resolveEvalAccess } from '@/lib/hr-evals/eligibility'
import { requireTenantContext } from '@/lib/tenant/authorization'
import { toHrCoreErrorResponse } from '@/lib/hr-core/shared'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) {
    return unauthorizedResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const access = await resolveEvalAccess(tenant)

    if (!access.eligible) {
      return NextResponse.json({ error: 'Not eligible for evaluations module.' }, { status: 403 })
    }

    const [pendingAssignments, summaries] = await Promise.all([
      listAssignments({ evaluatorId: access.memberId ?? undefined, status: 'pending' }),
      listEvalSummaries(undefined, access.memberId ?? undefined)
    ])

    return NextResponse.json({
      memberId: access.memberId,
      pendingAssignments,
      summaries
    })
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to load my evaluations.')
  }
}
