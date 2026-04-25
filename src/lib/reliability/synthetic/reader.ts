import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { SyntheticProbeRecord, SyntheticRouteSnapshot } from '@/types/reliability-synthetic'

import { mapRowToProbeRecord } from './persist'

interface ProbeRow extends Record<string, unknown> {
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
}

/**
 * Última corrida observada por (módulo, ruta). Usa DISTINCT ON para tomar
 * el `finished_at` más reciente por combinación.
 *
 * Eficiente: el índice (module_key, route_path, finished_at DESC) cubre el
 * sort + filter sin scan completo.
 */
export const getLatestSyntheticSnapshotsByRoute = async (
  moduleKeys?: string[]
): Promise<SyntheticRouteSnapshot[]> => {
  const filter = moduleKeys && moduleKeys.length > 0 ? `WHERE module_key = ANY($1)` : ''
  const params = moduleKeys && moduleKeys.length > 0 ? [moduleKeys] : []

  const rows = await runGreenhousePostgresQuery<ProbeRow>(
    `SELECT DISTINCT ON (module_key, route_path)
        probe_id, sweep_run_id, module_key, route_path,
        http_status, ok, latency_ms, error_message,
        triggered_by, started_at, finished_at
      FROM greenhouse_sync.reliability_synthetic_runs
      ${filter}
      ORDER BY module_key, route_path, finished_at DESC`,
    params
  )

  return rows.map(row => ({
    moduleKey: row.module_key as SyntheticRouteSnapshot['moduleKey'],
    routePath: row.route_path,
    lastProbe: mapRowToProbeRecord(row)
  }))
}

/**
 * Última corrida del sweep — útil para mostrar "última ejecución X min ago"
 * en Admin Center.
 */
export const getLatestSweepRun = async (): Promise<{
  sweepRunId: string
  startedAt: string
  finishedAt: string | null
  status: string
  notes: string | null
} | null> => {
  const rows = await runGreenhousePostgresQuery<
    Record<string, unknown> & {
      sync_run_id: string
      started_at: string | Date
      finished_at: string | Date | null
      status: string
      notes: string | null
    }
  >(
    `SELECT sync_run_id, started_at, finished_at, status, notes
       FROM greenhouse_sync.source_sync_runs
      WHERE source_system = 'reliability_synthetic'
      ORDER BY started_at DESC
      LIMIT 1`
  )

  const row = rows[0]

  if (!row) return null

  return {
    sweepRunId: row.sync_run_id,
    startedAt: row.started_at instanceof Date ? row.started_at.toISOString() : row.started_at,
    finishedAt: row.finished_at
      ? row.finished_at instanceof Date
        ? row.finished_at.toISOString()
        : row.finished_at
      : null,
    status: row.status,
    notes: row.notes
  }
}

export const getSyntheticRunHistory = async (limit = 20): Promise<SyntheticProbeRecord[]> => {
  const rows = await runGreenhousePostgresQuery<ProbeRow>(
    `SELECT probe_id, sweep_run_id, module_key, route_path,
            http_status, ok, latency_ms, error_message,
            triggered_by, started_at, finished_at
       FROM greenhouse_sync.reliability_synthetic_runs
      ORDER BY finished_at DESC
      LIMIT $1`,
    [limit]
  )

  return rows.map(mapRowToProbeRecord)
}
