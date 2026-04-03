import { randomUUID } from 'node:crypto'

import { NextResponse } from 'next/server'

import { alertCronFailure } from '@/lib/alerts/slack-notify'
import { requireCronAuth } from '@/lib/cron/require-cron-auth'
import { checkIntegrationReadiness } from '@/lib/integrations/readiness'

import { syncNotionToConformed, writeSyncConformedRunRecord } from '@/lib/sync/sync-notion-conformed'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET(request: Request) {
  const { authorized, errorResponse } = requireCronAuth(request)
  const skippedSyncRunId = `sync-cron-${randomUUID()}`

  if (!authorized) {
    return errorResponse
  }

  // ── Readiness gate: check Notion integration status ──
  try {
    const readiness = await checkIntegrationReadiness('notion', { requireRawFreshness: true })

    if (!readiness.ready) {
      console.log(`[sync-conformed] Skipped: Notion upstream not ready — ${readiness.reason}`)

      await writeSyncConformedRunRecord({
        syncRunId: skippedSyncRunId,
        status: 'cancelled',
        notes: `Readiness gate blocked conformed sync: ${readiness.reason}`
      })

      return NextResponse.json({
        skipped: true,
        reason: readiness.reason,
        syncRunId: skippedSyncRunId,
        details: readiness.details ?? null
      })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown readiness error'

    console.error('[sync-conformed] Readiness check failed:', error)
    await writeSyncConformedRunRecord({
      syncRunId: skippedSyncRunId,
      status: 'failed',
      notes: `Readiness gate failed: ${message}`
    })
    await alertCronFailure('sync-conformed-readiness', error)

    return NextResponse.json({ error: message, syncRunId: skippedSyncRunId }, { status: 502 })
  }

  try {
    const result = await syncNotionToConformed()

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    console.error('Conformed sync failed:', error)
    await alertCronFailure('sync-conformed', error)

    return NextResponse.json({ error: message }, { status: 502 })
  }
}
