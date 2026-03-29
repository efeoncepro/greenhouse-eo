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
    const currencies = [...new Set(entries.map(entry => entry.currency))]

    const totalsByCurrency = currencies.map(currency => ({
      currency,
      gross: entries.filter(entry => entry.currency === currency).reduce((sum, entry) => sum + entry.grossTotal, 0),
      net: entries.filter(entry => entry.currency === currency).reduce((sum, entry) => sum + entry.netTotal, 0)
    }))

    const singleCurrencyTotals = totalsByCurrency.length === 1 ? totalsByCurrency[0] : null

    return NextResponse.json({
      entries,
      summary: {
        total: entries.length,
        manualKpiEntries: entries.filter(entry => entry.kpiDataSource === 'manual').length,
        manualOverrideEntries: entries.filter(entry => entry.manualOverride).length,
        mixedCurrency: totalsByCurrency.length > 1,
        totalsByCurrency,
        totalGross: singleCurrencyTotals?.gross ?? null,
        totalNet: singleCurrencyTotals?.net ?? null
      }
    })
  } catch (error) {
    return toPayrollErrorResponse(error, 'Unable to load payroll entries.')
  }
}
