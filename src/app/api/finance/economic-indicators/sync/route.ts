import { NextResponse } from 'next/server'

import {
  DEFAULT_ECONOMIC_INDICATORS_HISTORY_START,
  ECONOMIC_INDICATOR_CODES,
  syncEconomicIndicator,
  syncEconomicIndicatorsHistory,
  type EconomicIndicatorCode
} from '@/lib/finance/economic-indicators'
import { requireCronAuth } from '@/lib/cron/require-cron-auth'
import { assertDateString, FinanceValidationError, normalizeString } from '@/lib/finance/shared'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const parseIndicatorCodes = (value: string | null): EconomicIndicatorCode[] => {
  const normalized = normalizeString(value)

  if (!normalized) {
    return [...ECONOMIC_INDICATOR_CODES]
  }

  return normalized
    .split(',')
    .map(item => normalizeString(item).toUpperCase())
    .filter((item): item is EconomicIndicatorCode => ECONOMIC_INDICATOR_CODES.includes(item as EconomicIndicatorCode))
}

export async function GET(request: Request) {
  try {
    const { authorized, errorResponse } = requireCronAuth(request)

    if (!authorized) {
      return errorResponse
    }

    const { searchParams } = new URL(request.url)
    const mode = normalizeString(searchParams.get('mode')) || 'daily'
    const indicatorCodes = parseIndicatorCodes(searchParams.get('codes'))

    if (mode === 'history') {
      const fromDate = assertDateString(
        normalizeString(searchParams.get('fromDate')) || DEFAULT_ECONOMIC_INDICATORS_HISTORY_START,
        'fromDate'
      )

      const toDate = normalizeString(searchParams.get('toDate'))

      return NextResponse.json(await syncEconomicIndicatorsHistory({
        fromDate,
        toDate: toDate ? assertDateString(toDate, 'toDate') : null,
        indicatorCodes
      }))
    }

    const requestedDate = normalizeString(searchParams.get('indicatorDate'))

    const results = await Promise.all(
      indicatorCodes.map(indicatorCode => syncEconomicIndicator({
        indicatorCode,
        requestedDate: requestedDate ? assertDateString(requestedDate, 'indicatorDate') : null
      }))
    )

    return NextResponse.json({ synced: true, results })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}

export async function POST(request: Request) {
  try {
    const { authorized } = requireCronAuth(request)

    if (!authorized) {
      const { tenant, errorResponse: tenantErrorResponse } = await requireFinanceTenantContext()

      if (!tenant) {
        return tenantErrorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const body = await request.json().catch(() => ({})) as {
      mode?: string
      fromDate?: string
      toDate?: string
      indicatorDate?: string
      codes?: string[] | string
    }

    const indicatorCodes = Array.isArray(body.codes)
      ? body.codes
          .map(item => normalizeString(item).toUpperCase())
          .filter((item): item is EconomicIndicatorCode => ECONOMIC_INDICATOR_CODES.includes(item as EconomicIndicatorCode))
      : parseIndicatorCodes(typeof body.codes === 'string' ? body.codes : null)

    if ((normalizeString(body.mode) || 'daily') === 'history') {
      return NextResponse.json(await syncEconomicIndicatorsHistory({
        fromDate: assertDateString(normalizeString(body.fromDate) || DEFAULT_ECONOMIC_INDICATORS_HISTORY_START, 'fromDate'),
        toDate: normalizeString(body.toDate) ? assertDateString(body.toDate, 'toDate') : null,
        indicatorCodes
      }))
    }

    const requestedDate = normalizeString(body.indicatorDate)

    const results = await Promise.all(
      indicatorCodes.map(indicatorCode => syncEconomicIndicator({
        indicatorCode,
        requestedDate: requestedDate ? assertDateString(requestedDate, 'indicatorDate') : null
      }))
    )

    return NextResponse.json({ synced: true, results })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
