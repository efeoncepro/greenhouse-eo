import 'server-only'

import { query } from '@/lib/db'

import type {
  FinanceLlmRunStatus,
  FinanceNexaInsightItem,
  FinanceNexaInsightsPayload
} from './finance-signal-types'

type RawRow = Record<string, unknown>

const toText = (value: unknown) => (typeof value === 'string' && value.trim() ? value : null)

const mapInsightItem = (row: RawRow): FinanceNexaInsightItem => ({
  id: String(row.enrichment_id),
  signalType: String(row.signal_type),
  metricId: String(row.metric_name),
  severity: toText(row.severity),
  explanation: toText(row.explanation_summary),
  rootCauseNarrative: toText(row.root_cause_narrative),
  recommendedAction: toText(row.recommended_action)
})

// ─── Portfolio-wide read (Finance Dashboard) ───────────────────────────────
// Surfaces the top-ranked finance enrichments for a period across all clients
// the caller is allowed to see. Current tenant isolation: Finance users have
// access to the whole portfolio, so we don't filter by client here.

export const readFinanceAiLlmSummary = async (
  periodYear: number,
  periodMonth: number,
  limit = 5
): Promise<FinanceNexaInsightsPayload> => {
  const [totalsRows, recentRows, latestRunRows] = await Promise.all([
    query<RawRow>(
      `
        SELECT
          COUNT(*) FILTER (WHERE status = 'succeeded') AS succeeded,
          MAX(processed_at)::text AS last_processed_at
        FROM greenhouse_serving.finance_ai_signal_enrichments
        WHERE period_year = $1
          AND period_month = $2
      `,
      [periodYear, periodMonth]
    ).catch(() => [] as RawRow[]),
    query<RawRow>(
      `
        SELECT
          enrichment_id,
          signal_type,
          metric_name,
          severity,
          explanation_summary,
          root_cause_narrative,
          recommended_action,
          quality_score,
          processed_at
        FROM greenhouse_serving.finance_ai_signal_enrichments
        WHERE period_year = $1
          AND period_month = $2
          AND status = 'succeeded'
        ORDER BY
          CASE COALESCE(severity, '')
            WHEN 'critical' THEN 0
            WHEN 'warning' THEN 1
            WHEN 'info' THEN 2
            ELSE 3
          END ASC,
          quality_score DESC NULLS LAST,
          processed_at DESC
        LIMIT $3
      `,
      [periodYear, periodMonth, limit]
    ).catch(() => [] as RawRow[]),
    query<RawRow>(
      `
        SELECT
          run_id,
          status,
          started_at::text AS started_at,
          completed_at::text AS completed_at
        FROM greenhouse_serving.finance_ai_enrichment_runs
        WHERE period_year = $1
          AND period_month = $2
        ORDER BY started_at DESC
        LIMIT 1
      `,
      [periodYear, periodMonth]
    ).catch(() => [] as RawRow[])
  ])

  const totalsRow = totalsRows[0] ?? {}
  const latestRunRow = latestRunRows[0]

  const insights = recentRows.map(mapInsightItem)

  return {
    totalAnalyzed: Number(totalsRow.succeeded ?? 0),
    lastAnalysis: toText(totalsRow.last_processed_at),
    runStatus: latestRunRow
      ? ((toText(latestRunRow.status) ?? 'failed') as FinanceLlmRunStatus)
      : null,
    insights
  }
}

// ─── Client-scoped read ────────────────────────────────────────────────────
// Used by client detail views and client economics drill-downs.

export const readClientFinanceAiLlmSummary = async (
  clientId: string,
  periodYear: number,
  periodMonth: number,
  limit = 3
): Promise<FinanceNexaInsightsPayload> => {
  const [totalsRows, recentRows, latestRunRows] = await Promise.all([
    query<RawRow>(
      `
        SELECT
          COUNT(*) FILTER (WHERE status = 'succeeded') AS succeeded,
          MAX(processed_at)::text AS last_processed_at
        FROM greenhouse_serving.finance_ai_signal_enrichments
        WHERE client_id = $1
          AND period_year = $2
          AND period_month = $3
      `,
      [clientId, periodYear, periodMonth]
    ).catch(() => [] as RawRow[]),
    query<RawRow>(
      `
        SELECT
          enrichment_id,
          signal_type,
          metric_name,
          severity,
          explanation_summary,
          root_cause_narrative,
          recommended_action,
          quality_score,
          processed_at
        FROM greenhouse_serving.finance_ai_signal_enrichments
        WHERE client_id = $1
          AND period_year = $2
          AND period_month = $3
          AND status = 'succeeded'
        ORDER BY
          CASE COALESCE(severity, '')
            WHEN 'critical' THEN 0
            WHEN 'warning' THEN 1
            WHEN 'info' THEN 2
            ELSE 3
          END ASC,
          quality_score DESC NULLS LAST,
          processed_at DESC
        LIMIT $4
      `,
      [clientId, periodYear, periodMonth, limit]
    ).catch(() => [] as RawRow[]),
    query<RawRow>(
      `
        SELECT run_id, status
        FROM greenhouse_serving.finance_ai_enrichment_runs
        WHERE period_year = $1
          AND period_month = $2
        ORDER BY started_at DESC
        LIMIT 1
      `,
      [periodYear, periodMonth]
    ).catch(() => [] as RawRow[])
  ])

  const totalsRow = totalsRows[0] ?? {}
  const latestRunRow = latestRunRows[0]

  return {
    totalAnalyzed: Number(totalsRow.succeeded ?? 0),
    lastAnalysis: toText(totalsRow.last_processed_at),
    runStatus: latestRunRow
      ? ((toText(latestRunRow.status) ?? 'failed') as FinanceLlmRunStatus)
      : null,
    insights: recentRows.map(mapInsightItem)
  }
}
