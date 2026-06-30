import 'server-only'

/**
 * TASK-1245 Slice 3 — Growth AI Visibility · Public delivery reliability signals (EPIC-020).
 *
 * 4 signals sobre la entrega pública del run (status + report):
 *  - public_status_read: volumen de reads públicos en 24 h (posture — visibilidad de tráfico/DoS);
 *  - public_delivery_pending: runs TERMINALES (succeeded/partial) cuyo finalizador NO materializó
 *    el delivery (`public_delivery_state='pending'`) >15 min después de terminar — auto-publish
 *    estancado o caído. steady=0 (data_quality);
 *  - public_delivery_inconsistent: invariante `delivery='ready' ⟹ existe snapshot publicable`.
 *    Una fila 'ready' sin snapshot es corrupción del estado materializado. steady=0 (data_quality).
 *  - report_review_pending (TASK-1244): runs `in_review` (gate humano YMYL) sin decisión >24 h —
 *    backlog de revisión estancado (riesgo: "reportes atascados sin reviewer"). backlog SLA, NO
 *    steady=0 (una revisión reciente es normal); warning si hay alguno añejo (posture).
 * DB vacía / pre-launch → steady ok. Degradación honesta: error de lectura → severity unknown.
 */

import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { ReliabilitySignal } from '@/types/reliability'

export const GROWTH_AI_VISIBILITY_PUBLIC_STATUS_READ_SIGNAL_ID = 'growth.ai_visibility.public_status_read'
export const GROWTH_AI_VISIBILITY_PUBLIC_DELIVERY_PENDING_SIGNAL_ID = 'growth.ai_visibility.public_delivery_pending'
export const GROWTH_AI_VISIBILITY_PUBLIC_DELIVERY_INCONSISTENT_SIGNAL_ID =
  'growth.ai_visibility.public_delivery_inconsistent'
export const GROWTH_AI_VISIBILITY_REPORT_REVIEW_PENDING_SIGNAL_ID = 'growth.ai_visibility.report_review_pending'

const MODULE_KEY = 'growth' as const

const severityForSteadyZero = (count: number): ReliabilitySignal['severity'] =>
  count === 0 ? 'ok' : count <= 3 ? 'warning' : 'error'

// Backlog SLA: pending reviews recientes son normales; sólo los añejos (>24 h) alertan.
const severityForBacklog = (count: number): ReliabilitySignal['severity'] => (count === 0 ? 'ok' : 'warning')

export const getGrowthAiVisibilityPublicDeliverySignals = async (): Promise<ReliabilitySignal[]> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await runGreenhousePostgresQuery<{
      reads_24h: number
      delivery_pending: number
      delivery_inconsistent: number
      review_pending_aged: number
    }>(
      `SELECT
         (SELECT COUNT(*)::int FROM greenhouse_growth.grader_intake_events
            WHERE outcome IN ('read_status', 'read_report') AND created_at > NOW() - INTERVAL '1 day') AS reads_24h,
         (SELECT COUNT(*)::int FROM greenhouse_growth.grader_runs r
            WHERE r.status IN ('succeeded', 'partial')
              AND r.public_delivery_state = 'pending'
              AND r.finished_at IS NOT NULL
              AND r.finished_at < NOW() - INTERVAL '15 minutes') AS delivery_pending,
         (SELECT COUNT(*)::int FROM greenhouse_growth.grader_runs r
            WHERE r.public_delivery_state = 'ready'
              AND NOT EXISTS (
                SELECT 1 FROM greenhouse_growth.grader_reports gr
                 WHERE gr.run_id = r.run_id AND gr.audience = 'public'
              )) AS delivery_inconsistent,
         (SELECT COUNT(*)::int FROM greenhouse_growth.grader_runs r
            WHERE r.public_delivery_state = 'in_review'
              AND r.finished_at IS NOT NULL
              AND r.finished_at < NOW() - INTERVAL '24 hours') AS review_pending_aged`,
    )

    const reads = Number(rows[0]?.reads_24h ?? 0)
    const pending = Number(rows[0]?.delivery_pending ?? 0)
    const inconsistent = Number(rows[0]?.delivery_inconsistent ?? 0)
    const reviewPendingAged = Number(rows[0]?.review_pending_aged ?? 0)

    return [
      {
        signalId: GROWTH_AI_VISIBILITY_PUBLIC_STATUS_READ_SIGNAL_ID,
        moduleKey: MODULE_KEY,
        kind: 'posture',
        source: 'getGrowthAiVisibilityPublicDeliverySignals',
        label: 'Reads públicos del run (AI Visibility)',
        severity: 'ok',
        summary:
          reads === 0 ? 'Sin reads públicos en 24 h (esperado pre-launch).' : `${reads} reads públicos en 24 h.`,
        observedAt,
        evidence: [{ kind: 'metric', label: 'reads_24h', value: String(reads) }],
      },
      {
        signalId: GROWTH_AI_VISIBILITY_PUBLIC_DELIVERY_PENDING_SIGNAL_ID,
        moduleKey: MODULE_KEY,
        kind: 'data_quality',
        source: 'getGrowthAiVisibilityPublicDeliverySignals',
        label: 'Entrega pública estancada (AI Visibility)',
        severity: severityForSteadyZero(pending),
        summary:
          pending === 0
            ? 'Sin runs terminales con entrega sin materializar.'
            : `${pending} run(s) terminal(es) con entrega 'pending' >15 min — finalizador estancado.`,
        observedAt,
        evidence: [{ kind: 'metric', label: 'delivery_pending', value: String(pending) }],
      },
      {
        signalId: GROWTH_AI_VISIBILITY_PUBLIC_DELIVERY_INCONSISTENT_SIGNAL_ID,
        moduleKey: MODULE_KEY,
        kind: 'data_quality',
        source: 'getGrowthAiVisibilityPublicDeliverySignals',
        label: 'Entrega ready sin snapshot (AI Visibility)',
        severity: severityForSteadyZero(inconsistent),
        summary:
          inconsistent === 0
            ? "Invariante OK: toda entrega 'ready' tiene snapshot publicable."
            : `${inconsistent} run(s) 'ready' sin snapshot — estado materializado inconsistente.`,
        observedAt,
        evidence: [{ kind: 'metric', label: 'delivery_inconsistent', value: String(inconsistent) }],
      },
      {
        signalId: GROWTH_AI_VISIBILITY_REPORT_REVIEW_PENDING_SIGNAL_ID,
        moduleKey: MODULE_KEY,
        kind: 'posture',
        source: 'getGrowthAiVisibilityPublicDeliverySignals',
        label: 'Reportes en revisión sin resolver (AI Visibility)',
        severity: severityForBacklog(reviewPendingAged),
        summary:
          reviewPendingAged === 0
            ? 'Sin reportes en revisión humana añejos (>24 h).'
            : `${reviewPendingAged} reporte(s) en revisión humana >24 h sin aprobar/rechazar.`,
        observedAt,
        evidence: [{ kind: 'metric', label: 'review_pending_aged', value: String(reviewPendingAged) }],
      },
    ]
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'growth_ai_visibility_public_delivery_signals' },
    })

    return [
      {
        signalId: GROWTH_AI_VISIBILITY_PUBLIC_DELIVERY_PENDING_SIGNAL_ID,
        moduleKey: MODULE_KEY,
        kind: 'data_quality',
        source: 'getGrowthAiVisibilityPublicDeliverySignals',
        label: 'Entrega pública (AI Visibility)',
        severity: 'unknown',
        summary: 'No fue posible leer las señales de entrega pública.',
        observedAt,
        evidence: [],
      },
    ]
  }
}
