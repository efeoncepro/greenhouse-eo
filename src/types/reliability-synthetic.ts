import type { ReliabilityModuleKey } from '@/types/reliability'

/**
 * TASK-632 — Reliability Synthetic Monitoring contracts
 *
 * Persistencia: greenhouse_sync.reliability_synthetic_runs (1 row por probe).
 * Cada sweep agrupa N probes bajo un mismo sweep_run_id (FK a source_sync_runs).
 */

export type SyntheticTriggerSource = 'cron' | 'manual'

export interface SyntheticProbeRecord {
  probeId: string
  sweepRunId: string
  moduleKey: ReliabilityModuleKey
  routePath: string
  httpStatus: number
  ok: boolean
  latencyMs: number
  errorMessage: string | null
  triggeredBy: SyntheticTriggerSource
  startedAt: string
  finishedAt: string
}

/**
 * Snapshot agregado por (módulo, ruta) — última corrida observada para cada
 * combinación. Lo consume el adapter buildSyntheticRouteSignals.
 */
export interface SyntheticRouteSnapshot {
  moduleKey: ReliabilityModuleKey
  routePath: string
  lastProbe: SyntheticProbeRecord
}

/**
 * Resumen de un sweep completo: el cron lo retorna y se persiste en
 * source_sync_runs.notes.
 */
export interface SyntheticSweepSummary {
  sweepRunId: string
  startedAt: string
  finishedAt: string
  triggeredBy: SyntheticTriggerSource
  routesProbed: number
  routesOk: number
  routesFailed: number
  durationMs: number
  skippedReason: string | null
}
