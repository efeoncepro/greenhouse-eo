import { NextResponse } from 'next/server'

import { requireCronAuth } from '@/lib/cron/require-cron-auth'
import { checkIntegrationReadiness } from '@/lib/integrations/readiness'
import { syncHubSpotCompanyLifecycles } from '@/lib/hubspot/sync-hubspot-company-lifecycle'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { authorized, errorResponse } = requireCronAuth(request)

  if (!authorized) {
    return errorResponse
  }

  try {
    const readiness = await checkIntegrationReadiness('hubspot')

    if (!readiness.ready) {
      console.log(`[hubspot-company-lifecycle-sync] Skipped: HubSpot upstream not ready — ${readiness.reason}`)

      return NextResponse.json({ skipped: true, reason: readiness.reason })
    }
  } catch (error) {
    console.warn('[hubspot-company-lifecycle-sync] Readiness check failed, proceeding anyway:', error)
  }

  try {
    const startMs = Date.now()
    const result = await syncHubSpotCompanyLifecycles()

    console.log(
      `[hubspot-company-lifecycle-sync] ${result.processed} companies, ${result.updated} updates, ${result.changed} changes, ${result.errors.length} errors, ${Date.now() - startMs}ms`
    )

    return NextResponse.json({
      ...result,
      durationMs: Date.now() - startMs
    })
  } catch (error) {
    console.error('[hubspot-company-lifecycle-sync] Cron failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
