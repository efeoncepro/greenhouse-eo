import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { ReliabilityModuleKey, ReliabilitySeverity } from '@/types/reliability'

import type { AiObservationScope } from './persist'

/**
 * TASK-638 — Reader del AI Observer.
 *
 * Expone las observaciones más recientes para:
 *  - Adapter `buildAiSummarySignals` que enriquece el composer con kind='ai_summary'.
 *  - UI `AiWatcherCard` que renderiza el resumen ejecutivo en Admin Center.
 *
 * NO realiza inferencia — solo lee lo último escrito por el runner. Si el
 * runner no ha corrido o el kill-switch está OFF, este reader devuelve listas
 * vacías sin error.
 */

export interface AiObservation {
  observationId: string
  sweepRunId: string
  moduleKey: ReliabilityModuleKey | 'overview'
  scope: AiObservationScope
  severity: ReliabilitySeverity
  fingerprint: string
  summary: string
  recommendedAction: string | null
  model: string
  promptTokens: number | null
  outputTokens: number | null
  observedAt: string
}

interface AiObservationRow extends Record<string, unknown> {
  observation_id: string
  sweep_run_id: string
  module_key: string
  scope: string
  severity: string
  fingerprint: string
  summary: string
  recommended_action: string | null
  model: string
  prompt_tokens: number | null
  output_tokens: number | null
  observed_at: Date | string
}

const toIso = (value: Date | string): string => {
  if (value instanceof Date) return value.toISOString()
  
return value
}

const normalizeRow = (row: AiObservationRow): AiObservation => ({
  observationId: row.observation_id,
  sweepRunId: row.sweep_run_id,
  moduleKey: row.module_key as AiObservation['moduleKey'],
  scope: row.scope as AiObservationScope,
  severity: row.severity as ReliabilitySeverity,
  fingerprint: row.fingerprint,
  summary: row.summary,
  recommendedAction: row.recommended_action,
  model: row.model,
  promptTokens: row.prompt_tokens,
  outputTokens: row.output_tokens,
  observedAt: toIso(row.observed_at)
})

/**
 * Última observación por (scope, module_key). Para overview usar
 * (scope='overview', moduleKey='overview'). Para módulos usar
 * (scope='module', moduleKey='finance' | 'integrations.notion' | ...).
 */
export const getLatestAiObservation = async (
  scope: AiObservationScope,
  moduleKey: string
): Promise<AiObservation | null> => {
  const rows = await runGreenhousePostgresQuery<AiObservationRow>(
    `SELECT observation_id, sweep_run_id, module_key, scope, severity, fingerprint,
            summary, recommended_action, model, prompt_tokens, output_tokens, observed_at
       FROM greenhouse_ai.reliability_ai_observations
      WHERE scope = $1 AND module_key = $2
      ORDER BY observed_at DESC
      LIMIT 1`,
    [scope, moduleKey]
  )

  return rows[0] ? normalizeRow(rows[0]) : null
}

/**
 * Snapshot consolidado: última observation de overview + última por cada
 * módulo presente en `reliability_ai_observations`. Se usa al construir el
 * Reliability Overview para colocar el `kind='ai_summary'` en cada módulo
 * que tenga una observación reciente.
 */
export const getLatestAiObservationsByScope = async (): Promise<{
  overview: AiObservation | null
  byModule: Record<string, AiObservation>
}> => {
  /**
   * Ventana corta: solo se toman observations de las últimas 24h. Esto evita
   * que el AI Observer renderice un resumen rancio si el runner se detuvo
   * por kill-switch o falla puntual de Gemini.
   */
  const rows = await runGreenhousePostgresQuery<AiObservationRow>(
    `WITH ranked AS (
       SELECT observation_id, sweep_run_id, module_key, scope, severity, fingerprint,
              summary, recommended_action, model, prompt_tokens, output_tokens, observed_at,
              ROW_NUMBER() OVER (PARTITION BY scope, module_key ORDER BY observed_at DESC) AS rn
         FROM greenhouse_ai.reliability_ai_observations
        WHERE observed_at > NOW() - INTERVAL '24 hours'
     )
     SELECT observation_id, sweep_run_id, module_key, scope, severity, fingerprint,
            summary, recommended_action, model, prompt_tokens, output_tokens, observed_at
       FROM ranked
      WHERE rn = 1`
  )

  const byModule: Record<string, AiObservation> = {}
  let overview: AiObservation | null = null

  for (const row of rows) {
    const obs = normalizeRow(row)

    if (obs.scope === 'overview') {
      overview = obs
    } else if (obs.scope === 'module') {
      byModule[obs.moduleKey] = obs
    }
  }

  return { overview, byModule }
}
