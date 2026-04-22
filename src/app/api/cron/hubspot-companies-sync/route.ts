import { NextResponse } from 'next/server'

import { requireCronAuth } from '@/lib/cron/require-cron-auth'
import { checkIntegrationReadiness } from '@/lib/integrations/readiness'
import { syncHubSpotCompanies } from '@/lib/hubspot/sync-hubspot-companies'

export const dynamic = 'force-dynamic'

const isTruthy = (value: string | null): boolean =>
  value ? ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase()) : false

export async function GET(request: Request) {
  const { authorized, errorResponse } = requireCronAuth(request)

  if (!authorized) {
    return errorResponse
  }

  try {
    const readiness = await checkIntegrationReadiness('hubspot')

    if (!readiness.ready) {
      return NextResponse.json({
        skipped: true,
        reason: readiness.reason
      })
    }
  } catch (error) {
    console.warn('[hubspot-companies-sync] Readiness check failed, proceeding anyway:', error)
  }

  const url = new URL(request.url)
  const dryRun = isTruthy(url.searchParams.get('dry'))
  const fullResync = isTruthy(url.searchParams.get('full'))

  try {
    const startMs = Date.now()
    const summary = await syncHubSpotCompanies({ dryRun, fullResync })

    return NextResponse.json({
      ...summary,
      durationMs: Date.now() - startMs
    })
  } catch (error) {
    console.error('[hubspot-companies-sync] Cron failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
