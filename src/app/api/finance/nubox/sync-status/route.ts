import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

export const dynamic = 'force-dynamic'

type SyncRunRow = {
  sync_run_id: string
  source_object_type: string
  sync_mode: string
  status: string
  records_read: number | null
  notes: string | null
  started_at: string | Date | null
  finished_at: string | Date | null
}

export async function GET() {
  await requireFinanceTenantContext()

  const runs = await runGreenhousePostgresQuery<SyncRunRow>(
    `SELECT sync_run_id, source_object_type, sync_mode, status,
            records_read, notes, started_at, finished_at
     FROM greenhouse_sync.source_sync_runs
     WHERE source_system = 'nubox'
     ORDER BY started_at DESC
     LIMIT 10`
  )

  const latest = runs[0] || null
  const lastRaw = runs.find(r => r.source_object_type === 'raw_sync') || null
  const lastConformed = runs.find(r => r.source_object_type === 'conformed_sync') || null

  // Aggregate counts from the most recent successful postgres projection run
  const lastProjection = runs.find(
    r => r.source_object_type === 'postgres_projection' && r.status === 'succeeded'
  )

  return NextResponse.json({
    lastSync: (lastRaw || latest)
      ? {
          syncRunId: (lastRaw || latest)!.sync_run_id,
          type: (lastRaw || latest)!.source_object_type,
          status: (lastRaw || latest)!.status,
          recordsRead: (lastRaw || latest)!.records_read,
          notes: (lastRaw || latest)!.notes,
          startedAt: (lastRaw || latest)!.started_at ? String((lastRaw || latest)!.started_at) : null,
          finishedAt: (lastRaw || latest)!.finished_at ? String((lastRaw || latest)!.finished_at) : null
        }
      : null,
    lastRaw: lastRaw
      ? {
          syncRunId: lastRaw.sync_run_id,
          status: lastRaw.status,
          recordsRead: lastRaw.records_read,
          notes: lastRaw.notes,
          startedAt: lastRaw.started_at ? String(lastRaw.started_at) : null,
          finishedAt: lastRaw.finished_at ? String(lastRaw.finished_at) : null
        }
      : null,
    lastConformed: lastConformed
      ? {
          syncRunId: lastConformed.sync_run_id,
          status: lastConformed.status,
          recordsRead: lastConformed.records_read,
          notes: lastConformed.notes,
          startedAt: lastConformed.started_at ? String(lastConformed.started_at) : null,
          finishedAt: lastConformed.finished_at ? String(lastConformed.finished_at) : null
        }
      : null,
    lastProjection: lastProjection
      ? {
          syncRunId: lastProjection.sync_run_id,
          status: lastProjection.status,
          recordsRead: lastProjection.records_read,
          notes: lastProjection.notes,
          finishedAt: lastProjection.finished_at ? String(lastProjection.finished_at) : null
        }
      : null,
    recentRuns: runs.map(r => ({
      syncRunId: r.sync_run_id,
      type: r.source_object_type,
      status: r.status,
      recordsRead: r.records_read,
      notes: r.notes,
      startedAt: r.started_at ? String(r.started_at) : null,
      finishedAt: r.finished_at ? String(r.finished_at) : null
    }))
  })
}
