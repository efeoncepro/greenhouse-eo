import type { ReliabilityModuleKey, ReliabilitySeverity, ReliabilitySignal } from '@/types/reliability'

import type { AiObservation } from './reader'

/**
 * TASK-638 — Adapter `buildAiSummarySignals`.
 *
 * Convierte las observaciones del AI Observer (persistidas en
 * `greenhouse_ai.reliability_ai_observations`) en `ReliabilitySignal[]`
 * con `kind='ai_summary'`, listas para ser inyectadas al composer.
 *
 * REGLA CLAVE — sin recursión:
 *   - El runner del AI Observer llama `getReliabilityOverview()` SIN pasar
 *     `aiObservations` en sources, así el snapshot que entra al prompt no
 *     contiene resúmenes IA previos.
 *   - El consumidor del overview (Admin Center, dashboard) sí pasa las
 *     observations para que la UI muestre el `kind=ai_summary` por módulo.
 *   - El composer respeta este toggle: si no se pasa la fuente, no hay
 *     señales `ai_summary`. Esto evita que la IA "se observe a sí misma".
 *
 * Severity:
 *   - Para módulo: usa la severity reportada por la IA (validada por el runner).
 *   - Para overview: NO se inyecta como signal por módulo (es un resumen
 *     ejecutivo que vive en otra superficie de UI — `AiWatcherCard`).
 *
 * Edge cases:
 *   - Observación de un módulo no canónico → se descarta (defensa en profundidad).
 *   - Resumen vacío → se descarta.
 */

const VALID_MODULE_KEYS: ReadonlySet<ReliabilityModuleKey> = new Set([
  'finance',
  'integrations.notion',
  'cloud',
  'delivery'
])

const VALID_SEVERITIES: ReadonlySet<ReliabilitySeverity> = new Set([
  'ok',
  'warning',
  'error',
  'unknown',
  'not_configured',
  'awaiting_data'
])

export const buildAiSummarySignals = (
  byModule: Record<string, AiObservation>
): ReliabilitySignal[] => {
  const signals: ReliabilitySignal[] = []

  for (const [moduleKey, observation] of Object.entries(byModule)) {
    if (!VALID_MODULE_KEYS.has(moduleKey as ReliabilityModuleKey)) continue
    if (!VALID_SEVERITIES.has(observation.severity)) continue
    if (!observation.summary.trim()) continue

    const summary = observation.recommendedAction
      ? `${observation.summary} — Acción sugerida: ${observation.recommendedAction}`
      : observation.summary

    signals.push({
      signalId: `${moduleKey}.ai.${observation.observationId}`,
      moduleKey: moduleKey as ReliabilityModuleKey,
      kind: 'ai_summary',
      source: 'reliability_ai_observer',
      label: 'AI summary',
      severity: observation.severity,
      summary,
      observedAt: observation.observedAt,
      evidence: [
        {
          kind: 'run',
          label: 'sweep_run_id',
          value: observation.sweepRunId
        },
        {
          kind: 'metric',
          label: 'fingerprint',
          value: observation.fingerprint
        },
        {
          kind: 'doc',
          label: 'model',
          value: observation.model
        }
      ]
    })
  }

  return signals
}
