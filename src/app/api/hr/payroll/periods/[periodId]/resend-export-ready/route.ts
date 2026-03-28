import { NextResponse } from 'next/server'

import { getPayrollPeriod } from '@/lib/payroll/get-payroll-periods'
import { sendPayrollExportReadyNotification } from '@/lib/payroll/send-payroll-export-ready'
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

    const period = await getPayrollPeriod(periodId)

    if (!period) {
      return NextResponse.json({ error: 'Payroll period not found.' }, { status: 404 })
    }

    if (period.status !== 'exported') {
      return NextResponse.json({ error: 'Only exported payroll periods can resend export-ready emails.' }, { status: 409 })
    }

    const deliveryId = await sendPayrollExportReadyNotification(periodId, tenant.userId)

    return NextResponse.json({ ok: true, deliveryId })
  } catch (error) {
    return toPayrollErrorResponse(error, 'Unable to resend payroll export-ready email.')
  }
}
