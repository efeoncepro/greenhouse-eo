import { NextResponse } from 'next/server'

import { requireCronAuth } from '@/lib/cron/require-cron-auth'
import { checkIntegrationReadiness } from '@/lib/integrations/readiness'

import { syncAllOrganizationServices } from '@/lib/services/service-sync'

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
      console.log(`[services-sync] Skipped: HubSpot upstream not ready — ${readiness.reason}`)

      return NextResponse.json({ skipped: true, reason: readiness.reason })
    }
  } catch (error) {
    console.warn('[services-sync] Readiness check failed, proceeding anyway:', error)
  }

  try {
    const startMs = Date.now()
    const { organizations, results } = await syncAllOrganizationServices()

    const totalCreated = results.reduce((s, r) => s + r.created, 0)
    const totalUpdated = results.reduce((s, r) => s + r.updated, 0)
    const totalErrors = results.reduce((s, r) => s + r.errors.length, 0)

    console.log(
      `[services-sync] ${organizations} orgs, ${totalCreated} created, ${totalUpdated} updated, ${totalErrors} errors, ${Date.now() - startMs}ms`
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
    console.error('[services-sync] Cron failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
