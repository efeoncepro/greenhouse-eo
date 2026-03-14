import { NextResponse } from 'next/server'

import { getMemberPayrollHistory } from '@/lib/payroll/get-payroll-entries'
import { toPayrollErrorResponse } from '@/lib/payroll/api-response'
import { requireHrTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET(_: Request, { params }: { params: Promise<{ memberId: string }> }) {
  const { tenant, errorResponse } = await requireHrTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { memberId } = await params
    const history = await getMemberPayrollHistory(memberId)

    return NextResponse.json(history)
  } catch (error) {
    return toPayrollErrorResponse(error, 'Unable to load payroll member history.')
  }
}
