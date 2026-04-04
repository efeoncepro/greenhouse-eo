import 'server-only'

import type { ProjectionDefinition } from '../projection-registry'
import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

const toNum = (value: unknown): number | null => {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null

  if (typeof value === 'string') {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

const toText = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim()

    return trimmed || null
  }

  if (value && typeof value === 'object' && 'value' in value) {
    return toText((value as { value?: unknown }).value)
  }

  return null
}

const toBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()

    return normalized === 'true' || normalized === 't' || normalized === '1'
  }

  return true
}

const toJsonText = (value: unknown): string => {
  if (typeof value === 'string') {
    const trimmed = value.trim()

    return trimmed || '{}'
  }

  if (value && typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return '{}'
    }
  }

  return '{}'
}

const toPeriodKey = (periodYear: number, periodMonth: number) =>
  `${periodYear}-${String(periodMonth).padStart(2, '0')}`

const parsePeriodScope = (scope: { entityType: string; entityId: string }) => {
  if (scope.entityType === 'ico_ai_signals_space') {
    const [spaceId, periodPart] = scope.entityId.split(':')
    const [yearPart, monthPart] = (periodPart ?? '').split('-')

    return {
      spaceId: toText(spaceId),
      periodYear: toNum(yearPart),
      periodMonth: toNum(monthPart)
    }
  }

  const [yearPart, monthPart] = scope.entityId.split('-')

  return {
    spaceId: null,
    periodYear: toNum(yearPart),
    periodMonth: toNum(monthPart)
  }
}

const resolveScopeFromPayload = (payload: Record<string, unknown>) => {
  const periodYear = toNum(payload.periodYear)
  const periodMonth = toNum(payload.periodMonth)
  const spaceId = toText(payload.spaceId)

  if (!Number.isInteger(periodYear) || !Number.isInteger(periodMonth)) {
    return null
  }

  const normalizedPeriodYear = periodYear as number
  const normalizedPeriodMonth = periodMonth as number

  if (spaceId) {
    return {
      entityType: 'ico_ai_signals_space',
      entityId: `${spaceId}:${toPeriodKey(normalizedPeriodYear, normalizedPeriodMonth)}`
    }
  }

  return {
    entityType: 'ico_ai_signals_period',
    entityId: toPeriodKey(normalizedPeriodYear, normalizedPeriodMonth)
  }
}

const deleteServingRows = async (periodYear: number, periodMonth: number, spaceId: string | null) => {
  if (spaceId) {
    await runGreenhousePostgresQuery(
      `DELETE FROM greenhouse_serving.ico_ai_signals
       WHERE period_year = $1
         AND period_month = $2
         AND space_id = $3`,
      [periodYear, periodMonth, spaceId]
    )

    return
  }

  await runGreenhousePostgresQuery(
    `DELETE FROM greenhouse_serving.ico_ai_signals
     WHERE period_year = $1
       AND period_month = $2`,
    [periodYear, periodMonth]
  )
}

const upsertServingRow = async (row: Record<string, unknown>) => {
  const signalId = toText(row.signal_id)
  const signalType = toText(row.signal_type)
  const spaceId = toText(row.space_id)
  const metricName = toText(row.metric_name)
  const periodYear = toNum(row.period_year)
  const periodMonth = toNum(row.period_month)
  const modelVersion = toText(row.model_version)
  const generatedAt = toText(row.generated_at)

  if (!signalId || !signalType || !spaceId || !metricName || !Number.isInteger(periodYear) || !Number.isInteger(periodMonth) || !modelVersion || !generatedAt) {
    return false
  }

  const normalizedPeriodYear = periodYear as number
  const normalizedPeriodMonth = periodMonth as number

  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_serving.ico_ai_signals (
      signal_id,
      signal_type,
      space_id,
      member_id,
      project_id,
      metric_name,
      period_year,
      period_month,
      severity,
      current_value,
      expected_value,
      z_score,
      predicted_value,
      confidence,
      prediction_horizon,
      contribution_pct,
      dimension,
      dimension_id,
      action_type,
      action_summary,
      action_target_id,
      model_version,
      generated_at,
      ai_eligible,
      source,
      payload_json,
      synced_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10, $11, $12,
      $13, $14, $15, $16, $17, $18,
      $19, $20, $21, $22, $23, $24,
      $25, $26::jsonb, NOW()
    )
    ON CONFLICT (signal_id) DO UPDATE SET
      signal_type = EXCLUDED.signal_type,
      space_id = EXCLUDED.space_id,
      member_id = EXCLUDED.member_id,
      project_id = EXCLUDED.project_id,
      metric_name = EXCLUDED.metric_name,
      period_year = EXCLUDED.period_year,
      period_month = EXCLUDED.period_month,
      severity = EXCLUDED.severity,
      current_value = EXCLUDED.current_value,
      expected_value = EXCLUDED.expected_value,
      z_score = EXCLUDED.z_score,
      predicted_value = EXCLUDED.predicted_value,
      confidence = EXCLUDED.confidence,
      prediction_horizon = EXCLUDED.prediction_horizon,
      contribution_pct = EXCLUDED.contribution_pct,
      dimension = EXCLUDED.dimension,
      dimension_id = EXCLUDED.dimension_id,
      action_type = EXCLUDED.action_type,
      action_summary = EXCLUDED.action_summary,
      action_target_id = EXCLUDED.action_target_id,
      model_version = EXCLUDED.model_version,
      generated_at = EXCLUDED.generated_at,
      ai_eligible = EXCLUDED.ai_eligible,
      source = EXCLUDED.source,
      payload_json = EXCLUDED.payload_json,
      synced_at = NOW()`,
    [
      signalId,
      signalType,
      spaceId,
      toText(row.member_id),
      toText(row.project_id),
      metricName,
      normalizedPeriodYear,
      normalizedPeriodMonth,
      toText(row.severity),
      toNum(row.current_value),
      toNum(row.expected_value),
      toNum(row.z_score),
      toNum(row.predicted_value),
      toNum(row.confidence),
      toText(row.prediction_horizon),
      toNum(row.contribution_pct),
      toText(row.dimension),
      toText(row.dimension_id),
      toText(row.action_type),
      toText(row.action_summary),
      toText(row.action_target_id),
      modelVersion,
      generatedAt,
      toBoolean(row.ai_eligible),
      toText(row.source) ?? 'ico_engine.ai_signals',
      toJsonText(row.payload_json)
    ]
  )

  return true
}

export const icoAiSignalsProjection: ProjectionDefinition = {
  name: 'ico_ai_signals',
  description: 'Mirror ICO AI signals from BigQuery into greenhouse_serving',
  domain: 'delivery',

  triggerEvents: ['ico.ai_signals.materialized'],

  extractScope: payload => resolveScopeFromPayload(payload),

  refresh: async (scope, payload) => {
    const { periodYear, periodMonth, spaceId } = parsePeriodScope(scope)

    if (!Number.isInteger(periodYear) || !Number.isInteger(periodMonth)) {
      return `skipped ico_ai_signals refresh for ${scope.entityId}: invalid period`
    }

    const normalizedPeriodYear = periodYear as number
    const normalizedPeriodMonth = periodMonth as number

    const payloadPeriodYear = toNum(payload.periodYear)
    const payloadPeriodMonth = toNum(payload.periodMonth)
    const payloadSpaceId = toText(payload.spaceId)
    const effectiveSpaceId = spaceId ?? payloadSpaceId ?? null

    const year = Number.isInteger(payloadPeriodYear) ? (payloadPeriodYear as number) : normalizedPeriodYear
    const month = Number.isInteger(payloadPeriodMonth) ? (payloadPeriodMonth as number) : normalizedPeriodMonth

    try {
      const projectId = getBigQueryProjectId()
      const bigQuery = getBigQueryClient()

      await deleteServingRows(year, month, effectiveSpaceId)

      const query = effectiveSpaceId
        ? `
          SELECT *
          FROM \`${projectId}.ico_engine.ai_signals\`
          WHERE period_year = @periodYear
            AND period_month = @periodMonth
            AND space_id = @spaceId
          ORDER BY generated_at DESC, signal_id ASC
        `
        : `
          SELECT *
          FROM \`${projectId}.ico_engine.ai_signals\`
          WHERE period_year = @periodYear
            AND period_month = @periodMonth
          ORDER BY generated_at DESC, signal_id ASC
        `

      const params = effectiveSpaceId
        ? { periodYear: year, periodMonth: month, spaceId: effectiveSpaceId }
        : { periodYear: year, periodMonth: month }

      const [rows] = await bigQuery.query({ query, params })

      let upserted = 0

      for (const row of rows as Record<string, unknown>[]) {
        const written = await upsertServingRow(row)

        if (written) {
          upserted += 1
        }
      }

      const scopeLabel = effectiveSpaceId ? `${effectiveSpaceId} @ ${year}-${String(month).padStart(2, '0')}` : `${year}-${String(month).padStart(2, '0')}`

      return `refreshed ico_ai_signals for ${scopeLabel} (${upserted} rows)`
    } catch (error) {
      return `skipped ico_ai_signals refresh for ${scope.entityId}: ${error instanceof Error ? error.message : 'unknown error'}`
    }
  },

  maxRetries: 1
}
