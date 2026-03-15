import { NextResponse } from 'next/server'

import { ensureFinanceInfrastructure } from '@/lib/finance/schema'
import { assertDateString, FinanceValidationError, normalizeString } from '@/lib/finance/shared'
import { syncDailyUsdClpExchangeRate } from '@/lib/finance/exchange-rates'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const hasInternalSyncAccess = (request: Request) => {
  const configuredSecret = normalizeString(process.env.CRON_SECRET)
  const authHeader = normalizeString(request.headers.get('authorization'))
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : ''
  const vercelCronHeader = normalizeString(request.headers.get('x-vercel-cron'))
  const userAgent = normalizeString(request.headers.get('user-agent'))

  if (configuredSecret && bearerToken && bearerToken === configuredSecret) {
    return true
  }

  return vercelCronHeader === '1' || userAgent.startsWith('vercel-cron/')
}

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
  await ensureFinanceInfrastructure()

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

export async function GET(request: Request) {
  try {
    if (!hasInternalSyncAccess(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rateDate = normalizeString(new URL(request.url).searchParams.get('rateDate'))

    return await syncAndRespond(rateDate ? assertDateString(rateDate, 'rateDate') : null)
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}

export async function POST(request: Request) {
  try {
    if (!hasInternalSyncAccess(request)) {
      const { tenant, errorResponse } = await requireFinanceTenantContext()

      if (!tenant) {
        return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const rateDate = await getRequestedRateDate(request)

    return await syncAndRespond(rateDate)
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
