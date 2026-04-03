import { NextResponse } from 'next/server'

import { getPayrollEntries } from '@/lib/payroll/get-payroll-entries'
import { toPayrollErrorResponse } from '@/lib/payroll/api-response'
import { requireHrTenantContext } from '@/lib/tenant/authorization'
import { resolveExchangeRateToClp, roundCurrency, invertExchangeRate } from '@/lib/finance/shared'

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
    const isMultiCurrency = totalsByCurrency.length > 1
    const usdTotals = totalsByCurrency.find(t => t.currency === 'USD')
    const clpTotals = totalsByCurrency.find(t => t.currency === 'CLP')

    // Consolidated currency equivalents via canonical finance helpers
    let clpEquivalent: { grossClp: number; netClp: number; fxRate: number } | null = null
    let usdEquivalent: { grossUsd: number; netUsd: number; fxRate: number } | null = null

    if (isMultiCurrency && usdTotals && usdTotals.gross > 0) {
      try {
        const usdToClp = await resolveExchangeRateToClp({ currency: 'USD' })
        const clpToUsd = invertExchangeRate({ rate: usdToClp })
        const grossUsd = usdTotals.gross
        const grossClp = clpTotals?.gross ?? 0
        const netUsd = usdTotals.net
        const netClp = clpTotals?.net ?? 0

        clpEquivalent = {
          grossClp: Math.round(grossUsd * usdToClp + grossClp),
          netClp: Math.round(netUsd * usdToClp + netClp),
          fxRate: usdToClp
        }

        usdEquivalent = {
          grossUsd: roundCurrency(grossUsd + grossClp * clpToUsd),
          netUsd: roundCurrency(netUsd + netClp * clpToUsd),
          fxRate: usdToClp
        }
      } catch {
        // FX not available — skip equivalents
      }
    }

    return NextResponse.json({
      entries,
      summary: {
        total: entries.length,
        manualKpiEntries: entries.filter(entry => entry.kpiDataSource === 'manual').length,
        manualOverrideEntries: entries.filter(entry => entry.manualOverride).length,
        mixedCurrency: isMultiCurrency,
        totalsByCurrency,
        totalGross: singleCurrencyTotals?.gross ?? null,
        totalNet: singleCurrencyTotals?.net ?? null,
        clpEquivalent,
        usdEquivalent
      }
    })
  } catch (error) {
    return toPayrollErrorResponse(error, 'Unable to load payroll entries.')
  }
}
