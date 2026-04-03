import { NextResponse } from 'next/server'

import { alertCronFailure } from '@/lib/alerts/slack-notify'
import { requireCronAuth } from '@/lib/cron/require-cron-auth'
import { runNotionSyncOrchestration } from '@/lib/integrations/notion-sync-orchestration'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET(request: Request) {
  const { authorized, errorResponse } = requireCronAuth(request)

  if (!authorized) {
    return errorResponse
  }

  try {
    const result = await runNotionSyncOrchestration({
      executionSource: 'scheduled_primary'
    })

    if (result.dataQualityMonitor?.executed === false) {
      await alertCronFailure(
        'notion-delivery-data-quality-post-sync',
        result.dataQualityMonitor.error ?? 'Unknown post-sync data quality error',
        { syncRunId: result.syncRunId ?? 'unknown' }
      ).catch(() => {})
    }

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    console.error('Conformed sync failed:', error)
    await alertCronFailure('sync-conformed', error)

    return NextResponse.json({ error: message }, { status: 502 })
  }
}
