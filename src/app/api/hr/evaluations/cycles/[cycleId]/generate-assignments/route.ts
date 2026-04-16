import { NextResponse } from 'next/server'

import { generateAssignments } from '@/lib/hr-evals/assignment-generator'
import { requireHrCoreManageTenantContext, toHrCoreErrorResponse } from '@/lib/hr-core/shared'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: Promise<{ cycleId: string }> }) {
  const { tenant, errorResponse } = await requireHrCoreManageTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { cycleId } = await params
    const body = await request.json().catch(() => ({}))
    const minTenureDays = typeof body.minTenureDays === 'number' ? body.minTenureDays : 90
    const assignments = await generateAssignments(cycleId, minTenureDays)

    return NextResponse.json({ assignments }, { status: 201 })
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to generate assignments.')
  }
}
