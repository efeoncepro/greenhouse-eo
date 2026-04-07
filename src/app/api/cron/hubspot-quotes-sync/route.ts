import { NextResponse } from 'next/server'

import { requireCronAuth } from '@/lib/cron/require-cron-auth'
import { checkIntegrationReadiness } from '@/lib/integrations/readiness'

import { syncAllHubSpotQuotes } from '@/lib/hubspot/sync-hubspot-quotes'

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
      console.log(`[hubspot-quotes-sync] Skipped: HubSpot upstream not ready — ${readiness.reason}`)

      return NextResponse.json({ skipped: true, reason: readiness.reason })
    }
  } catch (error) {
    console.warn('[hubspot-quotes-sync] Readiness check failed, proceeding anyway:', error)
  }

  try {
    const startMs = Date.now()
    const { organizations, results } = await syncAllHubSpotQuotes()

    const totalCreated = results.reduce((s, r) => s + r.created, 0)
    const totalUpdated = results.reduce((s, r) => s + r.updated, 0)
    const totalErrors = results.reduce((s, r) => s + r.errors.length, 0)

    console.log(
      `[hubspot-quotes-sync] ${organizations} orgs, ${totalCreated} created, ${totalUpdated} updated, ${totalErrors} errors, ${Date.now() - startMs}ms`
    )

    return NextResponse.json({
      organizations,
      totalCreated,
      totalUpdated,
      totalErrors,
      durationMs: Date.now() - startMs,
      details: results.filter(r => r.created > 0 || r.updated > 0 || r.errors.length > 0)
    })
  } catch (error) {
    console.error('[hubspot-quotes-sync] Cron failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
