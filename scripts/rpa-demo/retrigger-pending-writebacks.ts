import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { EVENT_TYPES } from '@/lib/sync/event-catalog'

/**
 * TASK-913 Slice 3 — Nightly safety net canonical para writeback RpA V2 demo.
 *
 * Re-emite chain event `notion.task.metrics_writeback_requested.demo` para
 * cada snapshot que:
 *   - rpa_data_status='valid' AND rpa_value IS NOT NULL (writable)
 *   - written_to_notion_at IS NULL (no escrito aún)
 *   - notion_writeback_attempt_count < 4 (no dead-letter)
 *   - computed_at < NOW() - INTERVAL '30 minutes' (lag overdue)
 *
 * **Idempotency canonical**: el reactive consumer `notion-rpa-writeback-demo`
 * lee snapshot from PG y verifica `written_to_notion_at IS NULL` antes de
 * PATCH — re-emit safe.
 *
 * **Pattern fuente** (TASK-771 / TASK-878 nightly safety net):
 * - Cron Cloud Scheduler diario invoca este script via gcloud job
 * - Detecta gaps que el reactive cron normal (5 min) podría haber perdido
 * - Re-emit no genera duplicados Notion (idempotency PATCH + snapshot guard)
 *
 * Cross-refs:
 * - Compute upstream: src/lib/sync/projections/notion-rpa-compute-demo.ts
 * - Writeback downstream: src/lib/sync/projections/notion-rpa-writeback-demo.ts
 * - Signal lag observable: notion.metrics.writeback_lag_demo
 *
 * Uso:
 *   pnpm tsx --require ./scripts/lib/server-only-shim.cjs \
 *     scripts/rpa-demo/retrigger-pending-writebacks.ts [--dry-run] [--limit=100]
 */

type SnapshotPending = {
  snapshot_id: string
  task_source_id: string
  rpa_value: number | null
  rpa_data_status: string
  formula_version: string
  computed_at: Date | string
  notion_writeback_attempt_count: number
} & Record<string, unknown>

interface RetriggerOptions {
  dryRun: boolean
  limit: number
}

const parseArgs = (): RetriggerOptions => {
  const args = process.argv.slice(2)
  let dryRun = false
  let limit = 100

  for (const arg of args) {
    if (arg === '--dry-run') {
      dryRun = true
    } else if (arg.startsWith('--limit=')) {
      const parsed = Number(arg.split('=')[1])

      if (Number.isFinite(parsed) && parsed > 0) {
        limit = parsed
      }
    }
  }

  return { dryRun, limit }
}

const findPendingSnapshots = async (limit: number): Promise<SnapshotPending[]> => {
  return runGreenhousePostgresQuery<SnapshotPending>(
    `SELECT
        snapshot_id,
        task_source_id,
        rpa_value,
        rpa_data_status,
        formula_version,
        computed_at,
        notion_writeback_attempt_count
     FROM greenhouse_delivery.task_rpa_demo_snapshots
     WHERE workspace_id = 'demo'
       AND rpa_data_status = 'valid'
       AND rpa_value IS NOT NULL
       AND written_to_notion_at IS NULL
       AND notion_writeback_attempt_count < 4
       AND computed_at < NOW() - INTERVAL '30 minutes'
     ORDER BY computed_at ASC
     LIMIT $1`,
    [limit]
  )
}

const emitWritebackEvent = async (snapshot: SnapshotPending): Promise<string> => {
  return publishOutboxEvent({
    aggregateType: 'notion_task',
    aggregateId: snapshot.task_source_id,
    eventType: EVENT_TYPES.notionTaskMetricsWritebackRequestedDemo,
    payload: {
      schemaVersion: 1,
      taskSourceId: snapshot.task_source_id,
      workspaceId: 'demo',
      rpaValue: snapshot.rpa_value,
      rpaDataStatus: snapshot.rpa_data_status,
      snapshotId: snapshot.snapshot_id,
      formulaVersion: snapshot.formula_version,
      computedAt: new Date(snapshot.computed_at).toISOString(),
      retriggeredBySafetyNet: true,
      metadata: { demo_mode: true }
    }
  })
}

const main = async () => {
  const { dryRun, limit } = parseArgs()

  console.log(`[rpa-demo-safety-net] start dryRun=${dryRun} limit=${limit}`)

  const pending = await findPendingSnapshots(limit)

  console.log(`[rpa-demo-safety-net] found ${pending.length} pending snapshots`)

  if (pending.length === 0) {
    console.log('[rpa-demo-safety-net] steady state — nothing to retrigger')

    return
  }

  if (dryRun) {
    for (const snap of pending) {
      console.log(
        `[rpa-demo-safety-net] DRY-RUN would retrigger snapshot=${snap.snapshot_id} task=${snap.task_source_id} value=${snap.rpa_value} attempts=${snap.notion_writeback_attempt_count}`
      )
    }

    return
  }

  let emitted = 0
  let failed = 0

  for (const snap of pending) {
    try {
      const eventId = await emitWritebackEvent(snap)

      emitted += 1
      console.log(
        `[rpa-demo-safety-net] retriggered snapshot=${snap.snapshot_id} event=${eventId}`
      )
    } catch (err) {
      failed += 1
      console.error(
        `[rpa-demo-safety-net] failed to retrigger snapshot=${snap.snapshot_id}: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  console.log(
    `[rpa-demo-safety-net] done emitted=${emitted} failed=${failed} total=${pending.length}`
  )

  if (failed > 0) {
    process.exit(1)
  }
}

main().catch(err => {
  console.error('[rpa-demo-safety-net] fatal:', err)
  process.exit(1)
})
