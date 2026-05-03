import 'server-only'

import { createHash, randomUUID } from 'crypto'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

export type CloudCostAiSeverity = 'ok' | 'warning' | 'error' | 'skipped'
export type CloudCostAiConfidence = 'high' | 'medium' | 'low' | 'unknown'

export interface CloudCostAiObservationInput {
  observationId: string
  sweepRunId: string
  fingerprint: string
  severity: CloudCostAiSeverity
  executiveSummary: string
  topCostDrivers: unknown[]
  probableCauses: unknown[]
  attackPriority: unknown[]
  recommendedActions: unknown[]
  missingTelemetry: string[]
  confidence: CloudCostAiConfidence
  model: string
  promptTokens: number | null
  outputTokens: number | null
  observedAt: string
}

export interface CloudCostAiObservation extends CloudCostAiObservationInput {
  createdAt: string
}

const shortUuid = () => randomUUID().replace(/-/g, '').slice(0, 8)

export const generateCloudCostAiObservationId = () => `EO-CAI-${shortUuid()}`
export const generateCloudCostAiSweepRunId = () => `EO-CAS-${shortUuid()}`

export const stableFingerprint = (payload: unknown): string =>
  createHash('sha256').update(JSON.stringify(payload)).digest('hex')

export const getLatestCloudCostAiFingerprint = async (): Promise<string | null> => {
  const rows = await runGreenhousePostgresQuery<{ fingerprint: string | null }>(
    `SELECT fingerprint
       FROM greenhouse_ai.cloud_cost_ai_observations
      WHERE severity <> 'skipped'
      ORDER BY observed_at DESC
      LIMIT 1`
  )

  return rows[0]?.fingerprint ?? null
}

export const recordCloudCostAiObservation = async (
  input: CloudCostAiObservationInput
): Promise<void> => {
  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_ai.cloud_cost_ai_observations (
       observation_id, sweep_run_id, fingerprint, severity, executive_summary,
       top_cost_drivers, probable_causes, attack_priority, recommended_actions,
       missing_telemetry, confidence, model, prompt_tokens, output_tokens, observed_at
     )
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb,
             $10::text[], $11, $12, $13, $14, $15)
     ON CONFLICT (observation_id) DO NOTHING`,
    [
      input.observationId,
      input.sweepRunId,
      input.fingerprint,
      input.severity,
      input.executiveSummary.slice(0, 4000),
      JSON.stringify(input.topCostDrivers),
      JSON.stringify(input.probableCauses),
      JSON.stringify(input.attackPriority),
      JSON.stringify(input.recommendedActions),
      input.missingTelemetry,
      input.confidence,
      input.model,
      input.promptTokens,
      input.outputTokens,
      input.observedAt
    ]
  )
}

export const getLatestCloudCostAiObservation =
  async (): Promise<CloudCostAiObservation | null> => {
    const rows = await runGreenhousePostgresQuery<Record<string, unknown>>(
      `SELECT observation_id, sweep_run_id, fingerprint, severity, executive_summary,
              top_cost_drivers, probable_causes, attack_priority, recommended_actions,
              missing_telemetry, confidence, model, prompt_tokens, output_tokens,
              observed_at, created_at
         FROM greenhouse_ai.cloud_cost_ai_observations
        WHERE severity <> 'skipped'
        ORDER BY observed_at DESC
        LIMIT 1`
    )

    const row = rows[0]

    if (!row) return null

    return {
      observationId: String(row.observation_id),
      sweepRunId: String(row.sweep_run_id),
      fingerprint: String(row.fingerprint),
      severity: row.severity as CloudCostAiSeverity,
      executiveSummary: String(row.executive_summary),
      topCostDrivers: Array.isArray(row.top_cost_drivers) ? row.top_cost_drivers : [],
      probableCauses: Array.isArray(row.probable_causes) ? row.probable_causes : [],
      attackPriority: Array.isArray(row.attack_priority) ? row.attack_priority : [],
      recommendedActions: Array.isArray(row.recommended_actions) ? row.recommended_actions : [],
      missingTelemetry: Array.isArray(row.missing_telemetry)
        ? row.missing_telemetry.map(String)
        : [],
      confidence: row.confidence as CloudCostAiConfidence,
      model: String(row.model),
      promptTokens: typeof row.prompt_tokens === 'number' ? row.prompt_tokens : null,
      outputTokens: typeof row.output_tokens === 'number' ? row.output_tokens : null,
      observedAt: row.observed_at instanceof Date
        ? row.observed_at.toISOString()
        : String(row.observed_at),
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at)
    }
  }

export const hasRecentCloudCostAlertDispatch = async (
  fingerprint: string,
  cooldownHours: number
): Promise<boolean> => {
  const rows = await runGreenhousePostgresQuery<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1
         FROM greenhouse_ai.cloud_cost_alert_dispatches
        WHERE fingerprint = $1
          AND dispatched_at >= now() - ($2::text || ' hours')::interval
     ) AS exists`,
    [fingerprint, String(cooldownHours)]
  )

  return rows[0]?.exists === true
}

export const recordCloudCostAlertDispatch = async ({
  fingerprint,
  severity,
  summary,
  channels,
  driverIds
}: {
  fingerprint: string
  severity: 'warning' | 'error'
  summary: string
  channels: string[]
  driverIds: string[]
}) => {
  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_ai.cloud_cost_alert_dispatches (
       fingerprint, severity, summary, channels, driver_ids, dispatched_at
     )
     VALUES ($1, $2, $3, $4::text[], $5::text[], now())
     ON CONFLICT (fingerprint) DO UPDATE
       SET severity = EXCLUDED.severity,
           summary = EXCLUDED.summary,
           channels = EXCLUDED.channels,
           driver_ids = EXCLUDED.driver_ids,
           dispatched_at = EXCLUDED.dispatched_at`,
    [fingerprint, severity, summary.slice(0, 1000), channels, driverIds]
  )
}
