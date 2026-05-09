import 'server-only'

import { getRecentProjectionDegradationCount } from '@/lib/commercial/sample-sprints/runtime-projection'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-835 Slice 6 — Reliability signal canónico para detectar degradaciones
 * recurrentes de la Sample Sprints Runtime Projection.
 *
 * El reader cuenta cuántas projection executions con `degraded[]` severity=error
 * ocurrieron en los últimos 5 minutos in-memory (counter en
 * `runtime-projection.ts`). Steady state = 0.
 *
 * Notas de operación:
 *  - Counter es per-instance (Vercel functions son stateless por invocación).
 *    En cold start retorna 0 — degradación honest a "okay" cuando la instance
 *    es fresca, lo cual es correcto: si nadie observó degradación reciente,
 *    el dashboard NO debe alarmar.
 *  - severity=warning si count > 0 (no error — la projection no está caída,
 *    está degradada honest; el banner UI ya informa al usuario).
 *  - kind=drift porque el indicador es señal de degradación, no incidente
 *    en sí (los incidentes específicos los emite captureWithDomain dentro de
 *    la projection).
 */

export const SAMPLE_SPRINT_PROJECTION_DEGRADED_SIGNAL_ID = 'commercial.sample_sprint.projection_degraded'

const WINDOW_MINUTES = 5

export const getSampleSprintProjectionDegradedSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const count = getRecentProjectionDegradationCount()

    return {
      signalId: SAMPLE_SPRINT_PROJECTION_DEGRADED_SIGNAL_ID,
      moduleKey: 'commercial',
      kind: 'drift',
      source: 'getSampleSprintProjectionDegradedSignal',
      label: 'Sample Sprints projection degraded',
      severity: count === 0 ? 'ok' : 'warning',
      summary:
        count === 0
          ? 'Projection runtime de Sample Sprints sin degradaciones recientes.'
          : `${count} ${count === 1 ? 'degradación detectada' : 'degradaciones detectadas'} en los últimos ${WINDOW_MINUTES} minutos.`,
      observedAt,
      evidence: [
        {
          kind: 'helper',
          label: 'Reader',
          value: 'getRecentProjectionDegradationCount'
        },
        {
          kind: 'metric',
          label: 'window_minutes',
          value: String(WINDOW_MINUTES)
        },
        {
          kind: 'metric',
          label: 'count',
          value: String(count)
        },
        {
          kind: 'doc',
          label: 'Runbook',
          value: 'Revisa Sentry domain=commercial source=sample_sprints_runtime_projection. Causas típicas: cost_attribution VIEW caída, helpers de health timeout, capacity-checker degradado.'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'commercial', {
      tags: { source: 'reliability_signal_sample_sprint_projection_degraded' }
    })

    return {
      signalId: SAMPLE_SPRINT_PROJECTION_DEGRADED_SIGNAL_ID,
      moduleKey: 'commercial',
      kind: 'drift',
      source: 'getSampleSprintProjectionDegradedSignal',
      label: 'Sample Sprints projection degraded',
      severity: 'unknown',
      summary: 'No fue posible leer el signal de projection degraded. Revisa los logs.',
      observedAt,
      evidence: [
        {
          kind: 'metric',
          label: 'error',
          value: error instanceof Error ? error.message : String(error)
        }
      ]
    }
  }
}
