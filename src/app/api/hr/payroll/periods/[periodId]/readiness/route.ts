import { NextResponse } from 'next/server'

import { toPayrollErrorResponse } from '@/lib/payroll/api-response'
import { getPayrollPeriodReadiness } from '@/lib/payroll/payroll-readiness'
import { requireHrTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET(_: Request, { params }: { params: Promise<{ periodId: string }> }) {
  const { tenant, errorResponse } = await requireHrTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { periodId } = await params
    const readiness = await getPayrollPeriodReadiness(periodId)

    return NextResponse.json(readiness)
  } catch (error) {
    return toPayrollErrorResponse(error, 'Unable to load payroll readiness.')
  }
}
