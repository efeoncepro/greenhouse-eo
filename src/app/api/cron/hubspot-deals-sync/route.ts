import { NextResponse } from 'next/server'

import { requireCronAuth } from '@/lib/cron/require-cron-auth'
import { syncHubSpotDeals } from '@/lib/hubspot/sync-hubspot-deals'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { authorized, errorResponse } = requireCronAuth(request)

  if (!authorized) {
    return errorResponse
  }

  const url = new URL(request.url)
  const includeClosed = url.searchParams.get('includeClosed') !== 'false'

  try {
    const startMs = Date.now()
    const summary = await syncHubSpotDeals({ includeClosed })

    console.log(
      `[hubspot-deals-sync] source=${summary.totalSourceDeals} created=${summary.created} updated=${summary.updated} skipped=${summary.skipped} errors=${summary.errors.length} durationMs=${Date.now() - startMs}`
    )

    return NextResponse.json({
      ...summary,
      durationMs: Date.now() - startMs,
      details: summary.results.filter(result => result.action !== 'skipped' || result.error)
    })
  } catch (error) {
    console.error('[hubspot-deals-sync] Cron failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
