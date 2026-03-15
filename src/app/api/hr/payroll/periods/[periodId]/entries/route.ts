import { NextResponse } from 'next/server'

import { getPayrollEntries } from '@/lib/payroll/get-payroll-entries'
import { toPayrollErrorResponse } from '@/lib/payroll/api-response'
import { requireHrTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET(_: Request, { params }: { params: Promise<{ periodId: string }> }) {
  const { tenant, errorResponse } = await requireHrTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { periodId } = await params
    const entries = await getPayrollEntries(periodId)

    return NextResponse.json({
      entries,
      summary: {
        total: entries.length,
        manualKpiEntries: entries.filter(entry => entry.kpiDataSource === 'manual').length,
        manualOverrideEntries: entries.filter(entry => entry.manualOverride).length,
        totalGross: entries.reduce((sum, entry) => sum + entry.grossTotal, 0),
        totalNet: entries.reduce((sum, entry) => sum + entry.netTotal, 0)
      }
    })
  } catch (error) {
    return toPayrollErrorResponse(error, 'Unable to load payroll entries.')
  }
}
