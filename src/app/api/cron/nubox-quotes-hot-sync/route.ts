import { NextResponse } from 'next/server'

import { alertCronFailure } from '@/lib/alerts/slack-notify'
import { requireCronAuth } from '@/lib/cron/require-cron-auth'
import { checkIntegrationReadiness } from '@/lib/integrations/readiness'
import { syncNuboxQuotesHot } from '@/lib/nubox/sync-nubox-quotes-hot'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const parsePeriods = (request: Request) => {
  const url = new URL(request.url)
  const periodParam = url.searchParams.get('periods') || url.searchParams.get('period')

  return periodParam
    ? periodParam.split(',').map(period => period.trim()).filter(Boolean)
    : undefined
}

export async function GET(request: Request) {
  const { authorized, errorResponse } = requireCronAuth(request)

  if (!authorized) {
    return errorResponse
  }

  try {
    const readiness = await checkIntegrationReadiness('nubox')

    if (!readiness.ready) {
      console.log(`[nubox-quotes-hot-sync] Skipped: Nubox upstream not ready — ${readiness.reason}`)

      return NextResponse.json({ skipped: true, reason: readiness.reason })
    }
  } catch (error) {
    console.warn('[nubox-quotes-hot-sync] Readiness check failed, proceeding anyway:', error)
  }

  try {
    const result = await syncNuboxQuotesHot({ periods: parsePeriods(request) })

    console.log(
      `[nubox-quotes-hot-sync] sales=${result.salesFetched} quoteSales=${result.quoteSalesFetched} created=${result.quotesCreated} updated=${result.quotesUpdated} skipped=${result.quotesSkipped} durationMs=${result.durationMs}`
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('[nubox-quotes-hot-sync] Cron failed:', error)
    await alertCronFailure('nubox-quotes-hot-sync', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
