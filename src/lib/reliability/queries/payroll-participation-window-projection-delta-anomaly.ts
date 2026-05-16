import 'server-only'

import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-893 Slice 5 — Reliability signal reader.
 *
 * Detects abnormal delta between projected payroll under flag OFF (legacy
 * scalar prorationFactor) vs flag ON (per-member participation window).
 *
 * **V1.0 status: HONEST DEGRADATION (unknown severity)**.
 *
 * The signal exists in the canonical registry so operators see it on the
 * `/admin/operations` surface and understand it is a planned monitor.
 * However, the actual delta detection requires shadow compare data — a
 * mechanism where `projectPayrollForPeriod` runs BOTH paths (flag OFF +
 * flag ON) in parallel and emits the delta as a structured Sentry event
 * (`captureWithDomain('payroll', { source: 'participation_window.shadow_compare', ... })`)
 * or a dedicated `greenhouse_serving.payroll_shadow_compare_runs` table.
 *
 * V1.0 ships without shadow compare wiring because:
 * 1. Flag OFF is default — there's no "ON path" to compare against until
 *    staging flips it.
 * 2. The shadow compare must run in production (not just tests) to detect
 *    real-world deltas with real compensation data + real participation
 *    windows.
 * 3. The mechanism design (Sentry event vs PG table vs in-memory aggregator)
 *    needs operator input on aggregation window and noise tolerance.
 *
 * V1.1 follow-up will wire one of:
 * 1. Sentry events filtered by tag `source=participation_window.shadow_compare`
 * 2. New table `greenhouse_serving.payroll_shadow_compare_runs` materialized
 *    from a dedicated worker that runs both paths nightly during staging
 *    validation
 * 3. Aggregated `greenhouse_sync.smoke_lane_runs` rows from Playwright smoke
 *    that runs both paths.
 *
 * Until then, this signal returns `severity='unknown'` with a clear summary
 * so operators see "this monitor exists but is not yet wired" — better than
 * returning ok=0 (which would be misleading).
 *
 * **Kind**: `drift`. Steady state expected < 5% delta (V1.1).
 * **Severidad**: `unknown` V1.0; `warning > 5%`, `error > 15%` V1.1.
 */
export const PAYROLL_PARTICIPATION_WINDOW_PROJECTION_DELTA_ANOMALY_SIGNAL_ID =
  'payroll.participation_window.projection_delta_anomaly'

export const getPayrollParticipationWindowProjectionDeltaAnomalySignal =
  async (): Promise<ReliabilitySignal> => {
    const observedAt = new Date().toISOString()

    /*
     * V1.0 honest degradation. No PG query; no false signal. Operator sees
     * "monitor exists but is V1.1 follow-up" in the surface.
     */
    return {
      signalId: PAYROLL_PARTICIPATION_WINDOW_PROJECTION_DELTA_ANOMALY_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'drift',
      source: 'getPayrollParticipationWindowProjectionDeltaAnomalySignal',
      label: 'Delta proyección flag-ON vs legacy (TASK-893)',
      severity: 'unknown',
      summary:
        'Monitor reservado para V1.1 shadow-compare wiring. V1.0 no detecta delta automáticamente — requiere shadow-compare runs en staging post flag-flip.',
      observedAt,
      evidence: [
        { kind: 'metric', label: 'status', value: 'awaiting_v1_1_wiring' },
        { kind: 'doc', label: 'v1_1_options', value: 'sentry_event|pg_table|smoke_lane' }
      ]
    }
  }
