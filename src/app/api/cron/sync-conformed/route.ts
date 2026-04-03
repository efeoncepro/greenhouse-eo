import { randomUUID } from 'node:crypto'

import { NextResponse } from 'next/server'

import { alertCronFailure } from '@/lib/alerts/slack-notify'
import { runNotionDeliveryDataQualitySweep } from '@/lib/integrations/notion-delivery-data-quality'
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
    let dataQualityMonitor: {
      executed: boolean
      healthySpaces: number
      degradedSpaces: number
      brokenSpaces: number
      failedSpaces: number
      error?: string
    } | null = null

    try {
      const sweep = await runNotionDeliveryDataQualitySweep({
        executionSource: 'post_sync',
        sourceSyncRunId: result.syncRunId,
        periodField: 'due_date'
      })

      dataQualityMonitor = {
        executed: true,
        healthySpaces: sweep.healthySpaces,
        degradedSpaces: sweep.degradedSpaces,
        brokenSpaces: sweep.brokenSpaces,
        failedSpaces: sweep.failedSpaces
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown data quality monitor error'

      console.error('[sync-conformed] Post-sync data quality monitor failed:', error)
      await alertCronFailure('notion-delivery-data-quality-post-sync', error, {
        syncRunId: result.syncRunId
      })

      dataQualityMonitor = {
        executed: false,
        healthySpaces: 0,
        degradedSpaces: 0,
        brokenSpaces: 0,
        failedSpaces: 0,
        error: message
      }
    }

    return NextResponse.json({
      ...result,
      dataQualityMonitor
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    console.error('Conformed sync failed:', error)
    await alertCronFailure('sync-conformed', error)

    return NextResponse.json({ error: message }, { status: 502 })
  }
}
