import 'server-only'

import { randomUUID } from 'crypto'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { ReliabilityModuleKey, ReliabilitySeverity } from '@/types/reliability'

const shortUuid = () => randomUUID().replace(/-/g, '').slice(0, 8)

export const generateAiObservationId = () => `EO-RAI-${shortUuid()}`
export const generateAiSweepRunId = () => `EO-RAS-${shortUuid()}`

export type AiObservationScope = 'overview' | 'module'

export interface AiObservationInput {
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

interface LatestFingerprintRow {
  fingerprint: string | null
}

/**
 * Recupera el último fingerprint persistido para un (scope, moduleKey).
 * Si no hay registro previo, retorna null.
 */
export const getLatestFingerprint = async (
  scope: AiObservationScope,
  moduleKey: string
): Promise<string | null> => {
  const rows = await runGreenhousePostgresQuery<Record<string, unknown> & LatestFingerprintRow>(
    `SELECT fingerprint
       FROM greenhouse_ai.reliability_ai_observations
      WHERE scope = $1 AND module_key = $2
      ORDER BY observed_at DESC
      LIMIT 1`,
    [scope, moduleKey]
  )

  return rows[0]?.fingerprint ?? null
}

export const recordAiObservation = async (input: AiObservationInput): Promise<void> => {
  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_ai.reliability_ai_observations (
       observation_id, sweep_run_id, module_key, scope, severity, fingerprint,
       summary, recommended_action, model, prompt_tokens, output_tokens, observed_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     ON CONFLICT (observation_id) DO NOTHING`,
    [
      input.observationId,
      input.sweepRunId,
      input.moduleKey,
      input.scope,
      input.severity,
      input.fingerprint,
      input.summary.slice(0, 4000),
      input.recommendedAction ? input.recommendedAction.slice(0, 4000) : null,
      input.model,
      input.promptTokens,
      input.outputTokens,
      input.observedAt
    ]
  )
}
