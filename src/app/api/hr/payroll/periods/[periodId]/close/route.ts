import { NextResponse } from 'next/server'

import { closePayrollPeriod } from '@/lib/payroll/close-payroll-period'
import { toPayrollErrorResponse } from '@/lib/payroll/api-response'
import { requireHrTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function POST(_: Request, { params }: { params: Promise<{ periodId: string }> }) {
  const { tenant, errorResponse } = await requireHrTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { periodId } = await params
    const period = await closePayrollPeriod(periodId)

    return NextResponse.json(period)
  } catch (error) {
    return toPayrollErrorResponse(error, 'Unable to close payroll period.')
  }
}
