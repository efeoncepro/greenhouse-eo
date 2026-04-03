import { NextResponse } from 'next/server'

import { alertCronFailure } from '@/lib/alerts/slack-notify'
import { requireCronAuth } from '@/lib/cron/require-cron-auth'
import {
  listDueNotionSyncRecoveryRuns,
  runNotionSyncOrchestration
} from '@/lib/integrations/notion-sync-orchestration'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET(request: Request) {
  const { authorized, errorResponse } = requireCronAuth(request)

  if (!authorized) {
    return errorResponse
  }

  try {
    const dueRetries = await listDueNotionSyncRecoveryRuns()

    if (dueRetries.length === 0) {
      return NextResponse.json({
        processed: 0,
        message: 'No due Notion conformed retries',
        dueRetries: []
      })
    }

    const result = await runNotionSyncOrchestration({
      executionSource: 'scheduled_retry'
    })

    if (result.dataQualityMonitor?.executed === false) {
      await alertCronFailure(
        'notion-delivery-data-quality-post-sync-retry',
        result.dataQualityMonitor.error ?? 'Unknown post-sync retry data quality error',
        { syncRunId: result.syncRunId ?? 'unknown' }
      ).catch(() => {})
    }

    return NextResponse.json({
      ...result,
      dueRetries
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    console.error('[sync-conformed-recovery] Retry failed:', error)
    await alertCronFailure('sync-conformed-recovery', error)

    return NextResponse.json({ error: message }, { status: 502 })
  }
}
