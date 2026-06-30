import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'

import { detectFinanceAnomalies, type FinanceMetricSnapshot } from './anomaly-detector'
import {
  stableFinanceMaterializationRunId,
  type FinanceMaterializationRunStatus,
  type FinanceSignalRecord
} from './finance-signal-types'

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
  // TASK-1201 — status honesto del run de materialización + id de provenance.
  status: FinanceMaterializationRunStatus
  materializationRunId: string
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

// ─── Materialization provenance (append-only ledger) — TASK-1201 ────────────
//
// Una fila por ejecución del anomaly step. Append-only (NO DELETE/UPDATE). Es lo
// que permite al reader/status distinguir empty-positive (corrió, economics
// elegible, 0 anomalías) de empty-pending (nunca corrió / economics no listo).
// SoT: GREENHOUSE_FINANCE_AI_SIGNAL_SOURCE_OF_TRUTH_DECISION_V1.md

const resolveMaterializationStatus = (
  snapshotsEvaluated: number,
  signalsWritten: number
): FinanceMaterializationRunStatus => {
  if (snapshotsEvaluated === 0) return 'skipped_no_eligible_data'
  if (signalsWritten === 0) return 'empty_positive'

  return 'succeeded'
}

interface PersistMaterializationRunInput {
  materializationRunId: string
  triggerEventId: string | null
  periodYear: number
  periodMonth: number
  triggerType: string
  status: FinanceMaterializationRunStatus
  snapshotsEvaluated: number
  signalsWritten: number
  errorMessage: string | null
  durationMs: number
  startedAt: string
  completedAt: string | null
}

const persistMaterializationRun = async (run: PersistMaterializationRunInput): Promise<void> => {
  await query(
    `
      INSERT INTO greenhouse_serving.finance_ai_materialization_runs (
        materialization_run_id, trigger_event_id, period_year, period_month,
        trigger_type, status, snapshots_evaluated, signals_written,
        model_version, error_message, duration_ms, started_at, completed_at, synced_at
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8,
        $9, $10, $11, $12, $13, NOW()
      )
      ON CONFLICT (materialization_run_id) DO NOTHING
    `,
    [
      run.materializationRunId,
      run.triggerEventId,
      run.periodYear,
      run.periodMonth,
      run.triggerType,
      run.status,
      run.snapshotsEvaluated,
      run.signalsWritten,
      MODEL_VERSION,
      run.errorMessage,
      run.durationMs,
      run.startedAt,
      run.completedAt
    ]
  )
}

// ─── Latest materializable period resolver (TASK-941 Slice 7) ───────────────
//
// `client_economics` es una projection reactiva que materializa cuando cierra el
// payroll del mes (lag respecto al período corriente). Correr el cron Finance AI
// sobre el mes corriente (abierto, sin economics) producía 0 señales + run
// `succeeded` engañoso (ISSUE-082, root cause Finance separado del timestamp).
// Este resolver devuelve el último período CON economics para anclar el cron ahí,
// no en `now`. Self-healing: cuando Mayo cierre y obtenga economics, MAX avanza.

export const getLatestClientEconomicsPeriod = async (): Promise<{
  year: number
  month: number
} | null> => {
  const rows = await query<{ period_year: number | string; period_month: number | string }>(
    `
      SELECT period_year, period_month
      FROM greenhouse_finance.client_economics
      ORDER BY period_year DESC, period_month DESC
      LIMIT 1
    `
  )

  const row = rows[0]

  if (!row) {
    return null
  }

  const year = Number(row.period_year)
  const month = Number(row.period_month)

  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    return null
  }

  return { year, month }
}

// ─── Entry point ────────────────────────────────────────────────────────────

export const materializeFinanceSignals = async (
  input: MaterializeFinanceSignalsInput
): Promise<MaterializeFinanceSignalsResult> => {
  const startedAtMs = Date.now()
  const startedAt = new Date(startedAtMs).toISOString()
  const { periodYear, periodMonth } = input
  const triggerType = input.triggerType ?? 'manual'
  const materializationRunId = stableFinanceMaterializationRunId(periodYear, periodMonth)

  try {
    const { current, history } = await loadClientEconomicsWindow(periodYear, periodMonth)

    const generatedAt = new Date().toISOString()

    const signals = detectFinanceAnomalies({
      currentSnapshots: current,
      historyByScope: history,
      generatedAt,
      modelVersion: MODEL_VERSION
    })

    await persistSignals(signals, periodYear, periodMonth)

    const snapshotsEvaluated = current.length
    const signalsWritten = signals.length
    const status = resolveMaterializationStatus(snapshotsEvaluated, signalsWritten)
    const durationMs = Date.now() - startedAtMs

    // Provenance honesta del anomaly step (append-only). Best-effort: la falla del
    // ledger no debe tumbar el run, pero sí queda observable en Sentry.
    await persistMaterializationRun({
      materializationRunId,
      triggerEventId: input.triggerEventId ?? null,
      periodYear,
      periodMonth,
      triggerType,
      status,
      snapshotsEvaluated,
      signalsWritten,
      errorMessage: null,
      durationMs,
      startedAt,
      completedAt: new Date().toISOString()
    }).catch(error => {
      captureWithDomain(error, 'finance', {
        tags: { source: 'finance_ai_materialization_run', stage: 'provenance_write' }
      })
    })

    await publishOutboxEvent({
      aggregateType: AGGREGATE_TYPES.financeAiSignals,
      aggregateId: `finance-ai-signals-${periodYear}-${String(periodMonth).padStart(2, '0')}`,
      eventType: EVENT_TYPES.financeAiSignalsMaterialized,
      payload: {
        periodYear,
        periodMonth,
        snapshotsEvaluated,
        signalsWritten,
        status,
        triggerEventId: input.triggerEventId ?? null,
        triggerType
      }
    }).catch(() => {})

    return {
      periodYear,
      periodMonth,
      snapshotsEvaluated,
      signalsWritten,
      triggerType,
      durationMs,
      status,
      materializationRunId
    }
  } catch (error) {
    // Run-truth: una excepción NO es succeeded. Registrar provenance `failed`
    // (best-effort) y propagar para que el caller degrade/alerte honestamente.
    await persistMaterializationRun({
      materializationRunId,
      triggerEventId: input.triggerEventId ?? null,
      periodYear,
      periodMonth,
      triggerType,
      status: 'failed',
      snapshotsEvaluated: 0,
      signalsWritten: 0,
      errorMessage: error instanceof Error ? error.message : 'Unknown materialization error',
      durationMs: Date.now() - startedAtMs,
      startedAt,
      completedAt: new Date().toISOString()
    }).catch(provenanceError => {
      captureWithDomain(provenanceError, 'finance', {
        tags: { source: 'finance_ai_materialization_run', stage: 'provenance_write_failed' }
      })
    })

    throw error
  }
}
