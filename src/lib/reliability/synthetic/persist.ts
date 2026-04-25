import 'server-only'

import { randomUUID } from 'crypto'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { ReliabilityModuleKey } from '@/types/reliability'
import type {
  SyntheticProbeRecord,
  SyntheticSweepSummary,
  SyntheticTriggerSource
} from '@/types/reliability-synthetic'

const SOURCE_SYSTEM = 'reliability_synthetic'

const shortUuid = () => randomUUID().replace(/-/g, '').slice(0, 8)

export const generateSweepRunId = () => `EO-RSR-${shortUuid()}`
export const generateProbeId = () => `EO-RSP-${shortUuid()}`

/**
 * Inserta el sweep en source_sync_runs. Sigue el patrón canónico de
 * reactive-run-tracker: 1 row por sweep para que aparezca en Ops Health
 * junto a los demás syncs operativos.
 */
export const recordSweepStarted = async ({
  sweepRunId,
  triggeredBy,
  notes
}: {
  sweepRunId: string
  triggeredBy: SyntheticTriggerSource
  notes?: string | null
}): Promise<void> => {
  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_sync.source_sync_runs (
       sync_run_id, source_system, source_object_type, sync_mode,
       status, records_read, records_written_raw, triggered_by, notes, finished_at
     )
     VALUES ($1, $2, 'reliability_synthetic_routes', 'probe', 'running', 0, 0, $3, $4, NULL)
     ON CONFLICT (sync_run_id) DO NOTHING`,
    [sweepRunId, SOURCE_SYSTEM, triggeredBy, notes ?? null]
  )
}

/**
 * Persiste un probe individual contra una ruta. Idempotente por probe_id.
 */
export const recordProbeResult = async (probe: SyntheticProbeRecord): Promise<void> => {
  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_sync.reliability_synthetic_runs (
       probe_id, sweep_run_id, module_key, route_path,
       http_status, ok, latency_ms, error_message,
       triggered_by, started_at, finished_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (probe_id) DO NOTHING`,
    [
      probe.probeId,
      probe.sweepRunId,
      probe.moduleKey,
      probe.routePath,
      probe.httpStatus,
      probe.ok,
      probe.latencyMs,
      probe.errorMessage,
      probe.triggeredBy,
      probe.startedAt,
      probe.finishedAt
    ]
  )
}

/**
 * Cierra el sweep en source_sync_runs con el resumen agregado.
 */
export const recordSweepFinished = async (summary: SyntheticSweepSummary): Promise<void> => {
  const status =
    summary.skippedReason !== null
      ? 'cancelled'
      : summary.routesFailed > 0 && summary.routesOk > 0
        ? 'partial'
        : summary.routesFailed > 0
          ? 'failed'
          : 'succeeded'

  const note =
    summary.skippedReason !== null
      ? `skipped: ${summary.skippedReason}`
      : `${summary.routesProbed} probed · ${summary.routesOk} ok · ${summary.routesFailed} failed · ${summary.durationMs}ms`

  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_sync.source_sync_runs
       SET status = $2,
           records_read = $3,
           records_written_raw = $4,
           notes = $5,
           finished_at = CURRENT_TIMESTAMP
     WHERE sync_run_id = $1`,
    [summary.sweepRunId, status, summary.routesProbed, summary.routesOk, note]
  )
}

/**
 * Helper que resume rows raw de la tabla a la forma canonical SyntheticProbeRecord.
 */
export const mapRowToProbeRecord = (row: {
  probe_id: string
  sweep_run_id: string
  module_key: string
  route_path: string
  http_status: number | string
  ok: boolean
  latency_ms: number | string
  error_message: string | null
  triggered_by: string
  started_at: string | Date
  finished_at: string | Date
}): SyntheticProbeRecord => ({
  probeId: row.probe_id,
  sweepRunId: row.sweep_run_id,
  moduleKey: row.module_key as ReliabilityModuleKey,
  routePath: row.route_path,
  httpStatus: typeof row.http_status === 'number' ? row.http_status : Number(row.http_status),
  ok: Boolean(row.ok),
  latencyMs: typeof row.latency_ms === 'number' ? row.latency_ms : Number(row.latency_ms),
  errorMessage: row.error_message,
  triggeredBy: row.triggered_by as SyntheticTriggerSource,
  startedAt: row.started_at instanceof Date ? row.started_at.toISOString() : row.started_at,
  finishedAt: row.finished_at instanceof Date ? row.finished_at.toISOString() : row.finished_at
})
