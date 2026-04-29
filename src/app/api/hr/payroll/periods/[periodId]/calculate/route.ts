import { NextResponse } from 'next/server'

import { getServerAuthSession } from '@/lib/auth'
import { calculatePayroll } from '@/lib/payroll/calculate-payroll'
import { toPayrollErrorResponse } from '@/lib/payroll/api-response'
import { requireHrTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function POST(_: Request, { params }: { params: Promise<{ periodId: string }> }) {
  const { tenant, errorResponse } = await requireHrTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let resolvedPeriodId: string | null = null

  try {
    const session = await getServerAuthSession()
    const { periodId } = await params

    resolvedPeriodId = periodId

    const result = await calculatePayroll({
      periodId,
      actorIdentifier: session?.user?.email || tenant.userId
    })

    return NextResponse.json(result)
  } catch (error) {
    return toPayrollErrorResponse(error, 'Unable to calculate payroll.', {
      stage: 'calculate',
      periodId: resolvedPeriodId,
      actorUserId: tenant.userId
    })
  }
}
