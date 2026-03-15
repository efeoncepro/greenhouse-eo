import { NextResponse } from 'next/server'

import { getCompensationOverview } from '@/lib/payroll/get-compensation'
import { toPayrollErrorResponse } from '@/lib/payroll/api-response'
import { requireHrTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenant, errorResponse } = await requireHrTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const overview = await getCompensationOverview()

    return NextResponse.json({
      eligibleMembers: overview.eligibleMembers,
      summary: overview.summary
    })
  } catch (error) {
    return toPayrollErrorResponse(error, 'Unable to load payroll compensation candidates.')
  }
}
