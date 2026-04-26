import { NextResponse } from 'next/server'

import { runNotionSyncOrchestration } from '@/lib/integrations/notion-sync-orchestration'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * Manually trigger the Notion BQ-raw → conformed sync.
 *
 * Same code path as the daily cron `/api/cron/sync-conformed`
 * (`runNotionSyncOrchestration({ executionSource: 'manual_admin' })`),
 * but auth'd via the admin tenant context instead of `CRON_SECRET`. Safe
 * to call any time — the orchestration handles raw freshness gating,
 * waiting-for-raw scheduling, and post-sync DQ monitoring transparently.
 *
 * Use cases:
 *   - Recover from a previous failed daily run without waiting 24h.
 *   - Validate a sync code change end-to-end without rotating CRON_SECRET.
 *   - Drain an accumulated `fresh_raw_after_conformed_sync` parity lag.
 */
export async function POST() {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Step 1: BQ-side cycle (raw → conformed). May skip if BQ conformed is
    // already current. PG drain runs unconditionally below.
    const orchestrationResult = await runNotionSyncOrchestration({
      executionSource: 'manual_admin'
    })

    // Step 2: PG drain (BQ conformed → PG). Always runs regardless of step 1.
    // Closes the gap where BQ is fresh but PG is stale.
    const { syncBqConformedToPostgres } = await import('@/lib/sync/sync-bq-conformed-to-postgres')
    let pgProjection: Awaited<ReturnType<typeof syncBqConformedToPostgres>> | null = null
    let pgProjectionError: string | null = null

    try {
      pgProjection = await syncBqConformedToPostgres({
        syncRunId: orchestrationResult.syncRunId ?? `pg-drain-manual-${Date.now()}`,
        targetSpaceIds: null,
        replaceMissingForSpaces: true
      })
    } catch (err) {
      pgProjectionError = err instanceof Error ? err.message : String(err)
    }

    return NextResponse.json({
      triggered: true,
      orchestrator: 'manual_admin',
      orchestration: orchestrationResult,
      pgProjection,
      pgProjectionError
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown sync orchestration error'

    return NextResponse.json({ error: message }, { status: 502 })
  }
}
