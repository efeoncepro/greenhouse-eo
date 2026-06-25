import 'server-only'

/**
 * TASK-1242 — Growth AI Visibility · HubSpot lead handoff · reliability signal (drift).
 *
 * `lead_handoff_uncovered`: leads con consent + score `completed` (releasable) que NO tienen
 * `hubspot_synced_at` pasados 30 min ⇒ el handoff se está saltando silenciosamente (enqueue
 * perdido, consumer caído, o write fallando). Steady=0. El lag/dead-letter del reactive
 * handler lo cubre la infraestructura canónica de handler-health (no se duplica acá).
 *
 * Gate: cuando el flag `GROWTH_AI_VISIBILITY_LEAD_HANDOFF_ENABLED` está OFF, los leads no
 * sincronizados son ESPERADOS (pre-launch) → severity `ok` informativo, no alarma falsa.
 * Error de lectura → `unknown` (degradación honesta).
 */

import { isLeadHandoffEnabled } from '@/lib/growth/ai-visibility/flags'
import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { ReliabilitySignal } from '@/types/reliability'

export const GROWTH_AI_VISIBILITY_LEAD_HANDOFF_UNCOVERED_SIGNAL_ID = 'growth.ai_visibility.lead_handoff_uncovered'

export const getGrowthAiVisibilityLeadHandoffSignals = async (): Promise<ReliabilitySignal[]> => {
  const observedAt = new Date().toISOString()
  const enabled = isLeadHandoffEnabled()

  try {
    const rows = await runGreenhousePostgresQuery<{ uncovered: number }>(
      `SELECT COUNT(*)::int AS uncovered
         FROM greenhouse_growth.grader_leads l
        WHERE l.consent = TRUE
          AND l.hubspot_synced_at IS NULL
          AND l.created_at < NOW() - INTERVAL '30 minutes'
          AND EXISTS (
            SELECT 1 FROM greenhouse_growth.grader_scores s
             WHERE s.run_id = l.run_id AND s.score_status = 'completed'
          )`,
    )

    const uncovered = Number(rows[0]?.uncovered ?? 0)

    const severity: ReliabilitySignal['severity'] = !enabled
      ? 'ok'
      : uncovered > 3
        ? 'error'
        : uncovered > 0
          ? 'warning'
          : 'ok'

    return [
      {
        signalId: GROWTH_AI_VISIBILITY_LEAD_HANDOFF_UNCOVERED_SIGNAL_ID,
        moduleKey: 'growth',
        kind: 'drift',
        source: 'getGrowthAiVisibilityLeadHandoffSignals',
        label: 'Leads del grader sin sincronizar a HubSpot',
        severity,
        summary: !enabled
          ? `Handoff OFF: ${uncovered} lead(s) con score listo aún sin sincronizar (esperado pre-launch).`
          : uncovered > 0
            ? `${uncovered} lead(s) con consent + score listo sin llegar a HubSpot (>30 min) — handoff saltado.`
            : 'Todos los leads con score listo están sincronizados a HubSpot.',
        observedAt,
        evidence: [
          { kind: 'metric', label: 'uncovered', value: String(uncovered) },
          { kind: 'metric', label: 'handoff_enabled', value: String(enabled) },
        ],
      },
    ]
  } catch (error) {
    captureWithDomain(error, 'integrations.hubspot', {
      tags: { source: 'reliability_signal_growth_ai_visibility_lead_handoff' },
    })

    return [
      {
        signalId: GROWTH_AI_VISIBILITY_LEAD_HANDOFF_UNCOVERED_SIGNAL_ID,
        moduleKey: 'growth',
        kind: 'drift' as const,
        source: 'getGrowthAiVisibilityLeadHandoffSignals',
        label: 'Leads del grader sin sincronizar a HubSpot',
        severity: 'unknown' as const,
        summary: 'No fue posible leer el signal. Revisa los logs.',
        observedAt,
        evidence: [
          { kind: 'metric' as const, label: 'error', value: error instanceof Error ? error.message : String(error) },
        ],
      },
    ]
  }
}
