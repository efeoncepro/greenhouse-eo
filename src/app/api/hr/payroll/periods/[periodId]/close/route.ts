import { NextResponse } from 'next/server'

import { closePayrollPeriod } from '@/lib/payroll/close-payroll-period'
import { dispatchPayrollExportNotifications } from '@/lib/payroll/dispatch-payroll-export-notifications'
import { toPayrollErrorResponse } from '@/lib/payroll/api-response'
import { getPayrollPeriod } from '@/lib/payroll/get-payroll-periods'
import { requireHrTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function POST(_: Request, { params }: { params: Promise<{ periodId: string }> }) {
  const { tenant, errorResponse } = await requireHrTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let resolvedPeriodId: string | null = null

  try {
    const { periodId } = await params

    resolvedPeriodId = periodId
    const currentPeriod = await getPayrollPeriod(periodId)
    const { period, exportedNow } = await closePayrollPeriod(periodId)

    const notificationDispatch =
      currentPeriod?.status === 'exported' || !exportedNow ? null : await dispatchPayrollExportNotifications(periodId)

    return NextResponse.json({
      ...period,
      notificationDispatch
    })
  } catch (error) {
    return toPayrollErrorResponse(error, 'Unable to close payroll period.', {
      stage: 'close',
      periodId: resolvedPeriodId,
      actorUserId: tenant.userId
    })
  }
}
