import { NextResponse } from 'next/server'

import { requireCronAuth } from '@/lib/cron/require-cron-auth'
import { assertDateString, FinanceValidationError, normalizeString } from '@/lib/finance/shared'
import { syncDailyUsdClpExchangeRate } from '@/lib/finance/exchange-rates'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const getRequestedRateDate = async (request: Request) => {
  const { searchParams } = new URL(request.url)
  const searchDate = normalizeString(searchParams.get('rateDate'))

  if (searchDate) {
    return assertDateString(searchDate, 'rateDate')
  }

  const body = await request.json().catch(() => null) as { rateDate?: unknown } | null
  const bodyDate = normalizeString(body?.rateDate)

  return bodyDate ? assertDateString(bodyDate, 'rateDate') : null
}

const syncAndRespond = async (rateDate?: string | null) => {
  const result = await syncDailyUsdClpExchangeRate(rateDate)

  if (!result.synced) {
    return NextResponse.json({
      synced: false,
      requestedDate: result.requestedDate,
      error: 'Unable to fetch USD/CLP exchange rate from configured providers.'
    }, { status: 502 })
  }

  return NextResponse.json(result)
}

const buildFinanceValidationErrorResponse = (error: FinanceValidationError) =>
  NextResponse.json(
    {
      error: error.message,
      ...(error.code ? { code: error.code } : {})
    },
    { status: error.statusCode }
  )

export async function GET(request: Request) {
  try {
    const { authorized, errorResponse } = requireCronAuth(request)

    if (!authorized) {
      return errorResponse
    }

    const rateDate = normalizeString(new URL(request.url).searchParams.get('rateDate'))

    return await syncAndRespond(rateDate ? assertDateString(rateDate, 'rateDate') : null)
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return buildFinanceValidationErrorResponse(error)
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

    const rateDate = await getRequestedRateDate(request)

    return await syncAndRespond(rateDate)
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return buildFinanceValidationErrorResponse(error)
    }

    throw error
  }
}
