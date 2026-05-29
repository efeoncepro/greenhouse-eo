import 'server-only'

import { query } from '@/lib/db'

import { resolveFinanceNexaInsightsDataStatus } from './nexa-data-status'

import type {
  FinanceLlmRunStatus,
  FinanceNexaInsightItem,
  FinanceNexaInsightsPayload,
  FinanceNexaTimelineItem
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

const mapTimelineItem = (row: RawRow): FinanceNexaTimelineItem => ({
  ...mapInsightItem(row),
  processedAt: String(row.processed_at ?? '')
})

// ─── Timeline canonical (TASK-944) ──────────────────────────────────────────
//
// Patron mirror del Agency `readAgencyAiLlmTimeline` (TASK-914) pero adaptado al
// estado canonico Finance: NO existe `finance_ai_signal_enrichment_history`
// todavia (out of scope per TASK-944 spec; follow-up TASK-948+ canoniza Finance
// al patron append-only event log TASK-943).
//
// Honest degradation V1: lee del current table `finance_ai_signal_enrichments`
// ordenado por `processed_at DESC LIMIT N`. UI consumira esto como timeline
// funcional (semanticamente cronologico, NO evolutivo intra-periodo). Cuando
// emerja el history table Finance, este helper migra a leer del history sin
// cambiar el shape publico `FinanceNexaTimelineItem[]`.
//
// Default limit alineado con `TIMELINE_DEFAULT_LIMIT` Agency = 20.
// Cap = 50 (mirror `TIMELINE_MAX_LIMIT` Agency).

export const FINANCE_TIMELINE_DEFAULT_LIMIT = 20
export const FINANCE_TIMELINE_MAX_LIMIT = 50

/**
 * Read canonical timeline de Finance Nexa Insights.
 *
 * Pre-TASK-948 (sin history table): devuelve los enrichments mas recientes del
 * current table ordenados cronologicamente. UI lo consume como timeline
 * funcional sin distinguir vs evolution-true.
 *
 * Post-TASK-948 (con history table): migrar a leer
 * `greenhouse_serving.finance_ai_signal_enrichment_history` con `DISTINCT ON
 * (enrichment_id)` y ORDER BY `processed_at DESC` (mirror Agency pattern).
 * Shape publico inmutable: cero cambio en consumers.
 */
export const readFinanceAiLlmTimeline = async (
  limit = FINANCE_TIMELINE_DEFAULT_LIMIT
): Promise<FinanceNexaTimelineItem[]> => {
  const boundedLimit = Math.min(
    Math.max(Math.trunc(limit), 1),
    FINANCE_TIMELINE_MAX_LIMIT
  )

  const rows = await query<RawRow>(
    `
      SELECT
        enrichment_id,
        signal_type,
        metric_name,
        severity,
        explanation_summary,
        root_cause_narrative,
        recommended_action,
        processed_at::text AS processed_at
      FROM greenhouse_serving.finance_ai_signal_enrichments
      WHERE status = 'succeeded'
      ORDER BY processed_at DESC
      LIMIT $1
    `,
    [boundedLimit]
  ).catch(() => [] as RawRow[])

  return rows.map(mapTimelineItem)
}

// ─── Portfolio-wide read (Finance Dashboard) ───────────────────────────────
// Surfaces the top-ranked finance enrichments for a period across all clients
// the caller is allowed to see. Current tenant isolation: Finance users have
// access to the whole portfolio, so we don't filter by client here.

export const readFinanceAiLlmSummary = async (
  periodYear: number,
  periodMonth: number,
  limit = 5
): Promise<FinanceNexaInsightsPayload> => {
  const [totalsRows, recentRows, latestRunRows, timelineItems] = await Promise.all([
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
    ).catch(() => [] as RawRow[]),
    // TASK-944 — timeline canonical (mirror cross-surface contract).
    readFinanceAiLlmTimeline(FINANCE_TIMELINE_DEFAULT_LIMIT).catch(
      () => [] as FinanceNexaTimelineItem[]
    )
  ])

  const totalsRow = totalsRows[0] ?? {}
  const latestRunRow = latestRunRows[0]

  const insights = recentRows.map(mapInsightItem)
  const totalAnalyzed = Number(totalsRow.succeeded ?? 0)

  // TASK-946 — honest degradation state canonical via PG mirror reader.
  const dataStatus = await resolveFinanceNexaInsightsDataStatus({
    insightsCount: totalAnalyzed,
    periodYear,
    periodMonth
  })

  return {
    totalAnalyzed,
    lastAnalysis: toText(totalsRow.last_processed_at),
    runStatus: latestRunRow
      ? ((toText(latestRunRow.status) ?? 'failed') as FinanceLlmRunStatus)
      : null,
    insights,
    timeline: timelineItems,
    dataStatus
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
  const totalAnalyzed = Number(totalsRow.succeeded ?? 0)

  // TASK-946 — honest degradation state canonical (client-scoped variant
  // reusa el resolver PG-based; lastCronRun y eligibleCount son portfolio-wide
  // porque finance_ai_enrichment_runs no tiene client filter granular V1).
  const dataStatus = await resolveFinanceNexaInsightsDataStatus({
    insightsCount: totalAnalyzed,
    periodYear,
    periodMonth
  })

  return {
    totalAnalyzed,
    lastAnalysis: toText(totalsRow.last_processed_at),
    runStatus: latestRunRow
      ? ((toText(latestRunRow.status) ?? 'failed') as FinanceLlmRunStatus)
      : null,
    insights: recentRows.map(mapInsightItem),
    // TASK-944 — timeline canonical (client-scoped). Reusa el helper portfolio
    // sin filtro por client_id porque el current contract de timeline cross-surface
    // muestra los enrichments mas recientes del portfolio (no del cliente). Cuando
    // emerja Finance history table (TASK-948+) + se decida exponer client-scoped
    // timeline, sumar variant `readClientFinanceAiLlmTimeline(clientId, limit)`.
    timeline: await readFinanceAiLlmTimeline(FINANCE_TIMELINE_DEFAULT_LIMIT).catch(
      () => [] as FinanceNexaTimelineItem[]
    ),
    dataStatus
  }
}
