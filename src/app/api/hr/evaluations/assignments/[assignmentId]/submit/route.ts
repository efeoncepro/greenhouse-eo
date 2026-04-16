import { NextResponse } from 'next/server'

import { submitAssignment } from '@/lib/hr-evals/postgres-evals-store'
import { requireHrCoreManageTenantContext, toHrCoreErrorResponse } from '@/lib/hr-core/shared'

export const dynamic = 'force-dynamic'

export async function POST(_: Request, { params }: { params: Promise<{ assignmentId: string }> }) {
  const { tenant, errorResponse } = await requireHrCoreManageTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { assignmentId } = await params
    const assignment = await submitAssignment(assignmentId)

    return NextResponse.json(assignment)
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to submit assignment.')
  }
}
