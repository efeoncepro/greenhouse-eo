import { NextResponse } from 'next/server'

import { finalizeEvalSummary } from '@/lib/hr-evals/postgres-evals-store'
import { requireHrCoreManageTenantContext, toHrCoreErrorResponse } from '@/lib/hr-core/shared'

export const dynamic = 'force-dynamic'

export async function POST(_: Request, { params }: { params: Promise<{ summaryId: string }> }) {
  const { tenant, errorResponse } = await requireHrCoreManageTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { summaryId } = await params

    await finalizeEvalSummary(summaryId, tenant.userId)

    return NextResponse.json({ finalized: true })
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to finalize evaluation summary.')
  }
}
