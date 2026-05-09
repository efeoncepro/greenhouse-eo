import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-844 Slice 5 — Reliability signal: Cloud Run silent observability gap.
 *
 * Detecta dos clases de regresión en el contract canónico cross-runtime de
 * observabilidad (TASK-844):
 *
 * 1. **Sentry init regression**: filas en `outbox_reactive_log` con
 *    `last_error LIKE '%captureException is not a function%'` o
 *    `%not initialized%`. Indica que un Cloud Run service ejecutó código
 *    `src/lib/**` que invocó `captureWithDomain` sin que `initSentryForService`
 *    estuviera invocado en su `server.ts`. Root cause de ISSUE-074.
 *
 * 2. **Sentry hub no-op silent failures**: filas con `last_error LIKE
 *    '%Sentry%'` o `%@sentry%` en general. Catch-all defensivo para
 *    detectar cualquier mismatch de SDK shape entre runtimes.
 *
 * **Window**: últimas 24 horas (cron rate-limit; cada error queda visible
 * por 24h antes de descontarse del count).
 *
 * **Steady state esperado**: 0. Cualquier valor > 0 indica que un Cloud Run
 * service nuevo (o un reactive consumer existente bajo nueva path) está
 * ejecutándose sin Sentry init canónico. Lint rule (TASK-844 Slice 6) y
 * Hard Rule (Slice 7) previenen el regreso, pero esta señal es la última
 * línea de defensa runtime.
 *
 * **Severidad**:
 *   - 0 → ok
 *   - 1+ → error (datos perdidos potencialmente)
 *
 * Pattern reference: TASK-774 `account-balances-fx-drift.ts` (drift signal
 * con count + window + tolerance).
 */
export const CLOUD_RUN_SILENT_OBSERVABILITY_SIGNAL_ID =
  'observability.cloud_run.silent_failure_rate'

const DEFAULT_WINDOW_HOURS = 24

const COUNT_QUERY = `
  SELECT COUNT(*)::int AS n
  FROM greenhouse_sync.outbox_reactive_log
  WHERE reacted_at > NOW() - ($1 || ' hours')::interval
    AND (
      last_error ILIKE '%captureException is not a function%'
      OR last_error ILIKE '%captureMessage is not a function%'
      OR last_error ILIKE '%Sentry%not initialized%'
      OR last_error ILIKE '%@sentry/nextjs%'
    )
`

export const countCloudRunSilentObservabilityFailures = async (
  windowHours: number = DEFAULT_WINDOW_HOURS
): Promise<number> => {
  const rows = await query<{ n: number }>(COUNT_QUERY, [String(windowHours)])

  return Number(rows[0]?.n ?? 0)
}

export const getCloudRunSilentObservabilitySignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const count = await countCloudRunSilentObservabilityFailures(DEFAULT_WINDOW_HOURS)

    return {
      signalId: CLOUD_RUN_SILENT_OBSERVABILITY_SIGNAL_ID,
      moduleKey: 'cloud',
      kind: 'drift',
      source: 'getCloudRunSilentObservabilitySignal',
      label: 'Cloud Run services con observabilidad rota',
      severity: count === 0 ? 'ok' : 'error',
      summary:
        count === 0
          ? `Sin fallas Sentry/observability en outbox_reactive_log (últimas ${DEFAULT_WINDOW_HOURS}h).`
          : `${count} reactive consumer run${count === 1 ? '' : 's'} con error de Sentry init en últimas ${DEFAULT_WINDOW_HOURS}h. Verificar initSentryForService en services/<svc>/server.ts.`,
      observedAt,
      evidence: [
        {
          kind: 'sql',
          label: 'Detector',
          value: 'outbox_reactive_log.last_error ILIKE %captureException is not a function% OR %@sentry/nextjs%'
        },
        {
          kind: 'metric',
          label: 'count',
          value: String(count)
        },
        {
          kind: 'metric',
          label: 'window_hours',
          value: String(DEFAULT_WINDOW_HOURS)
        },
        {
          kind: 'doc',
          label: 'Spec',
          value: 'docs/tasks/in-progress/TASK-844-cross-runtime-observability-sentry-init.md'
        },
        {
          kind: 'doc',
          label: 'Issue',
          value: 'docs/issues/open/ISSUE-074-ops-worker-missing-sentry-bundle-blocks-projections.md'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'cloud', {
      tags: { source: 'reliability_signal_cloud_run_silent_observability' }
    })

    return {
      signalId: CLOUD_RUN_SILENT_OBSERVABILITY_SIGNAL_ID,
      moduleKey: 'cloud',
      kind: 'drift',
      source: 'getCloudRunSilentObservabilitySignal',
      label: 'Cloud Run services con observabilidad rota',
      severity: 'unknown',
      summary: 'Detector falló — no se pudo evaluar regresión de observabilidad. Revisar Cloud Logging.',
      observedAt,
      evidence: []
    }
  }
}
