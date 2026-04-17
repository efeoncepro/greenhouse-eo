import 'server-only'

import { query } from '@/lib/db'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'

import { detectFinanceAnomalies, type FinanceMetricSnapshot } from './anomaly-detector'
import type { FinanceSignalRecord } from './finance-signal-types'

const MODEL_VERSION = 'finance-ai-anomaly-v1'
const HISTORY_WINDOW_MONTHS = 6

// ─── Input ──────────────────────────────────────────────────────────────────

export interface MaterializeFinanceSignalsInput {
  periodYear: number
  periodMonth: number
  triggerEventId?: string | null
  triggerType?: string
}

export interface MaterializeFinanceSignalsResult {
  periodYear: number
  periodMonth: number
  snapshotsEvaluated: number
  signalsWritten: number
  triggerType: string
  durationMs: number
}

// ─── Load snapshots from client_economics ──────────────────────────────────

const toNum = (value: unknown): number | null => {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null

  if (typeof value === 'string') {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

type ClientEconomicsRow = Record<string, unknown> & {
  client_id: string
  organization_id: string | null
  period_year: number
  period_month: number
  total_revenue_clp: string | number | null
  direct_costs_clp: string | number | null
  indirect_costs_clp: string | number | null
  gross_margin_clp: string | number | null
  gross_margin_percent: string | number | null
  net_margin_clp: string | number | null
  net_margin_percent: string | number | null
}

const mapRowToSnapshot = (row: ClientEconomicsRow): FinanceMetricSnapshot => ({
  clientId: row.client_id,
  organizationId: row.organization_id,
  spaceId: null,
  periodYear: Number(row.period_year),
  periodMonth: Number(row.period_month),
  total_revenue_clp: toNum(row.total_revenue_clp),
  direct_costs_clp: toNum(row.direct_costs_clp),
  indirect_costs_clp: toNum(row.indirect_costs_clp),
  net_margin_clp: toNum(row.net_margin_clp),

  // Percentages are stored as decimal ratios (0.25 = 25%) in client_economics,
  // per the schema. Expose as percentages so the detector + Gemini see
  // human-scale values.
  gross_margin_pct: (() => {
    const value = toNum(row.gross_margin_percent)

    return value === null ? null : value * 100
  })(),
  net_margin_pct: (() => {
    const value = toNum(row.net_margin_percent)

    return value === null ? null : value * 100
  })()
})

const periodKey = (year: number, month: number) => year * 100 + month

const priorPeriodKey = (year: number, month: number) => {
  const date = new Date(year, month - 1 - HISTORY_WINDOW_MONTHS, 1)

  return date.getFullYear() * 100 + (date.getMonth() + 1)
}

const loadClientEconomicsWindow = async (
  periodYear: number,
  periodMonth: number
): Promise<{
  current: FinanceMetricSnapshot[]
  history: Map<string, FinanceMetricSnapshot[]>
}> => {
  const currentKey = periodKey(periodYear, periodMonth)
  const historyStartKey = priorPeriodKey(periodYear, periodMonth)

  const rows = await query<ClientEconomicsRow>(
    `
      SELECT
        client_id,
        organization_id,
        period_year,
        period_month,
        total_revenue_clp,
        direct_costs_clp,
        indirect_costs_clp,
        gross_margin_clp,
        gross_margin_percent,
        net_margin_clp,
        net_margin_percent
      FROM greenhouse_finance.client_economics
      WHERE (period_year * 100 + period_month) BETWEEN $1 AND $2
      ORDER BY client_id, period_year DESC, period_month DESC
    `,
    [historyStartKey, currentKey]
  )

  const current: FinanceMetricSnapshot[] = []
  const history = new Map<string, FinanceMetricSnapshot[]>()

  for (const row of rows) {
    const snapshot = mapRowToSnapshot(row)
    const rowKey = periodKey(snapshot.periodYear, snapshot.periodMonth)

    if (rowKey === currentKey) {
      current.push(snapshot)
      continue
    }

    const scope = snapshot.clientId ?? snapshot.organizationId ?? 'org-aggregate'
    const bucket = history.get(scope) ?? []

    bucket.push(snapshot)
    history.set(scope, bucket)
  }

  return { current, history }
}

// ─── Persist to Postgres ────────────────────────────────────────────────────

const persistSignals = async (
  signals: FinanceSignalRecord[],
  periodYear: number,
  periodMonth: number
): Promise<void> => {
  // Replace-current-period semantics: delete then insert. Keeps idempotency
  // with re-runs for the same month.
  await query(
    `
      DELETE FROM greenhouse_serving.finance_ai_signals
      WHERE period_year = $1 AND period_month = $2
    `,
    [periodYear, periodMonth]
  )

  if (signals.length === 0) return

  for (const signal of signals) {
    await query(
      `
        INSERT INTO greenhouse_serving.finance_ai_signals (
          signal_id, signal_type, organization_id, client_id, space_id,
          metric_name, period_year, period_month, severity,
          current_value, expected_value, z_score, predicted_value, confidence,
          prediction_horizon, contribution_pct, dimension, dimension_id,
          action_type, action_summary, action_target_id,
          model_version, generated_at, ai_eligible, payload_json, synced_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9,
          $10, $11, $12, $13, $14,
          $15, $16, $17, $18,
          $19, $20, $21,
          $22, $23, $24, $25::jsonb, NOW()
        )
        ON CONFLICT (signal_id) DO UPDATE SET
          severity = EXCLUDED.severity,
          current_value = EXCLUDED.current_value,
          expected_value = EXCLUDED.expected_value,
          z_score = EXCLUDED.z_score,
          payload_json = EXCLUDED.payload_json,
          synced_at = NOW()
      `,
      [
        signal.signalId,
        signal.signalType,
        signal.organizationId,
        signal.clientId,
        signal.spaceId,
        signal.metricName,
        signal.periodYear,
        signal.periodMonth,
        signal.severity,
        signal.currentValue,
        signal.expectedValue,
        signal.zScore,
        signal.predictedValue,
        signal.confidence,
        signal.predictionHorizon,
        signal.contributionPct,
        signal.dimension,
        signal.dimensionId,
        signal.actionType,
        signal.actionSummary,
        signal.actionTargetId,
        signal.modelVersion,
        signal.generatedAt,
        signal.aiEligible,
        JSON.stringify(signal.payloadJson)
      ]
    )
  }
}

// ─── Entry point ────────────────────────────────────────────────────────────

export const materializeFinanceSignals = async (
  input: MaterializeFinanceSignalsInput
): Promise<MaterializeFinanceSignalsResult> => {
  const startedAt = Date.now()
  const { periodYear, periodMonth } = input
  const triggerType = input.triggerType ?? 'manual'

  const { current, history } = await loadClientEconomicsWindow(periodYear, periodMonth)

  const generatedAt = new Date().toISOString()

  const signals = detectFinanceAnomalies({
    currentSnapshots: current,
    historyByScope: history,
    generatedAt,
    modelVersion: MODEL_VERSION
  })

  await persistSignals(signals, periodYear, periodMonth)

  await publishOutboxEvent({
    aggregateType: AGGREGATE_TYPES.financeAiSignals,
    aggregateId: `finance-ai-signals-${periodYear}-${String(periodMonth).padStart(2, '0')}`,
    eventType: EVENT_TYPES.financeAiSignalsMaterialized,
    payload: {
      periodYear,
      periodMonth,
      snapshotsEvaluated: current.length,
      signalsWritten: signals.length,
      triggerEventId: input.triggerEventId ?? null,
      triggerType
    }
  }).catch(() => {})

  return {
    periodYear,
    periodMonth,
    snapshotsEvaluated: current.length,
    signalsWritten: signals.length,
    triggerType,
    durationMs: Date.now() - startedAt
  }
}
