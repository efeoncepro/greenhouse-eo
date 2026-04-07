import { NextResponse } from 'next/server'

import { requireCronAuth } from '@/lib/cron/require-cron-auth'
import { checkIntegrationReadiness } from '@/lib/integrations/readiness'

import { syncHubSpotProductCatalog } from '@/lib/hubspot/sync-hubspot-products'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { authorized, errorResponse } = requireCronAuth(request)

  if (!authorized) {
    return errorResponse
  }

  // ── Readiness gate: check HubSpot integration status ──
  try {
    const readiness = await checkIntegrationReadiness('hubspot')

    if (!readiness.ready) {
      console.log(`[hubspot-products-sync] Skipped: HubSpot upstream not ready — ${readiness.reason}`)

      return NextResponse.json({ skipped: true, reason: readiness.reason })
    }
  } catch (error) {
    console.warn('[hubspot-products-sync] Readiness check failed, proceeding anyway:', error)
  }

  try {
    const startMs = Date.now()
    const result = await syncHubSpotProductCatalog()

    console.log(
      `[hubspot-products-sync] ${result.created} created, ${result.updated} updated, ${result.skipped} skipped, ${result.errors.length} errors, ${Date.now() - startMs}ms`
    )

    return NextResponse.json({
      ...result,
      durationMs: Date.now() - startMs
    })
  } catch (error) {
    console.error('[hubspot-products-sync] Cron failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
