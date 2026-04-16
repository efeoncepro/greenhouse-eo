import 'server-only'

import { query } from '@/lib/db'

import type {
  AgencyAiLlmSummary,
  AgencyAiLlmSummaryItem,
  IcoLlmRunStatus,
  OrganizationAiLlmEnrichmentItem,
  TopAiLlmEnrichmentItem
} from './llm-types'

type RawRow = Record<string, unknown>

const toNumber = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

const toText = (value: unknown) => (typeof value === 'string' && value.trim() ? value : null)

const mapSummaryItem = (row: RawRow): AgencyAiLlmSummaryItem => ({
  enrichmentId: String(row.enrichment_id),
  signalId: String(row.signal_id),
  signalType: String(row.signal_type),
  spaceId: String(row.space_id),
  metricName: String(row.metric_name),
  severity: toText(row.severity),
  qualityScore: toNumber(row.quality_score),
  explanationSummary: toText(row.explanation_summary),
  recommendedAction: toText(row.recommended_action),
  confidence: toNumber(row.confidence),
  processedAt: String(row.processed_at)
})

const mapOrganizationItem = (row: RawRow): OrganizationAiLlmEnrichmentItem => ({
  signalId: String(row.signal_id),
  spaceId: String(row.space_id),
  metricName: String(row.metric_name),
  signalType: String(row.signal_type),
  severity: toText(row.severity),
  qualityScore: toNumber(row.quality_score),
  explanationSummary: toText(row.explanation_summary),
  recommendedAction: toText(row.recommended_action),
  confidence: toNumber(row.confidence),
  processedAt: String(row.processed_at)
})

const mapTopItem = (row: RawRow): TopAiLlmEnrichmentItem => ({
  enrichmentId: String(row.enrichment_id),
  signalId: String(row.signal_id),
  spaceId: String(row.space_id),
  metricName: String(row.metric_name),
  signalType: String(row.signal_type),
  severity: toText(row.severity),
  qualityScore: toNumber(row.quality_score),
  explanationSummary: toText(row.explanation_summary),
  recommendedAction: toText(row.recommended_action),
  confidence: toNumber(row.confidence),
  processedAt: String(row.processed_at)
})

export const readAgencyAiLlmSummary = async (
  periodYear: number,
  periodMonth: number,
  limit = 8
): Promise<AgencyAiLlmSummary> => {
  const totalsRows = await query<RawRow>(
    `
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'succeeded') AS succeeded,
        COUNT(*) FILTER (WHERE status = 'failed') AS failed,
        AVG(quality_score) FILTER (WHERE status = 'succeeded') AS avg_quality_score,
        MAX(processed_at)::text AS last_processed_at
      FROM greenhouse_serving.ico_ai_signal_enrichments
      WHERE period_year = $1
        AND period_month = $2
    `,
    [periodYear, periodMonth]
  ).catch(() => [])

  const recentRows = await query<RawRow>(
    `
      SELECT *
      FROM greenhouse_serving.ico_ai_signal_enrichments
      WHERE period_year = $1
        AND period_month = $2
      ORDER BY processed_at DESC, quality_score DESC NULLS LAST
      LIMIT $3
    `,
    [periodYear, periodMonth, limit]
  ).catch(() => [])

  const latestRunRows = await query<RawRow>(
    `
      SELECT
        run_id,
        status,
        started_at::text AS started_at,
        completed_at::text AS completed_at,
        signals_seen,
        signals_enriched,
        signals_failed
      FROM greenhouse_serving.ico_ai_enrichment_runs
      WHERE period_year = $1
        AND period_month = $2
      ORDER BY started_at DESC
      LIMIT 1
    `,
    [periodYear, periodMonth]
  ).catch(() => [])

  const totalsRow = totalsRows[0] ?? {}
  const latestRunRow = latestRunRows[0]

  return {
    totals: {
      total: Number(totalsRow.total ?? 0),
      succeeded: Number(totalsRow.succeeded ?? 0),
      failed: Number(totalsRow.failed ?? 0),
      avgQualityScore: toNumber(totalsRow.avg_quality_score)
    },
    latestRun: latestRunRow
      ? {
          runId: String(latestRunRow.run_id),
          status: (toText(latestRunRow.status) ?? 'failed') as IcoLlmRunStatus,
          startedAt: String(latestRunRow.started_at),
          completedAt: toText(latestRunRow.completed_at),
          signalsSeen: Number(latestRunRow.signals_seen ?? 0),
          signalsEnriched: Number(latestRunRow.signals_enriched ?? 0),
          signalsFailed: Number(latestRunRow.signals_failed ?? 0)
        }
      : null,
    recentEnrichments: recentRows.map(mapSummaryItem),
    lastProcessedAt: toText(totalsRow.last_processed_at)
  }
}

const hasServingTable = async (tableName: string) => {
  const rows = await query<{ exists: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'greenhouse_serving'
          AND table_name = $1
      ) AS exists
    `,
    [tableName]
  ).catch(() => [])

  return rows[0]?.exists === true
}

export interface AiLlmOperationsSnapshot {
  tablesReady: boolean
  processed: number
  failed: number
  lastRun: string | null
  latestRun: {
    runId: string
    status: IcoLlmRunStatus
    startedAt: string
    completedAt: string | null
  } | null
  lastProcessedAt: string | null
}

export const readAiLlmOperationsSnapshot = async (): Promise<AiLlmOperationsSnapshot> => {
  const [hasEnrichmentsTable, hasRunsTable] = await Promise.all([
    hasServingTable('ico_ai_signal_enrichments'),
    hasServingTable('ico_ai_enrichment_runs')
  ])

  if (!hasEnrichmentsTable || !hasRunsTable) {
    return {
      tablesReady: false,
      processed: 0,
      failed: 0,
      lastRun: null,
      latestRun: null,
      lastProcessedAt: null
    }
  }

  const [totalsRows, latestRunRows] = await Promise.all([
    query<RawRow>(
      `
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status = 'failed') AS failed,
          MAX(processed_at)::text AS last_processed_at
        FROM greenhouse_serving.ico_ai_signal_enrichments
      `
    ).catch(() => []),
    query<RawRow>(
      `
        SELECT
          run_id,
          status,
          started_at::text AS started_at,
          completed_at::text AS completed_at
        FROM greenhouse_serving.ico_ai_enrichment_runs
        ORDER BY started_at DESC
        LIMIT 1
      `
    ).catch(() => [])
  ])

  const totalsRow = totalsRows[0] ?? {}
  const latestRunRow = latestRunRows[0]

  return {
    tablesReady: true,
    processed: Number(totalsRow.total ?? 0),
    failed: Number(totalsRow.failed ?? 0),
    lastRun: latestRunRow ? String(latestRunRow.started_at) : null,
    latestRun: latestRunRow
      ? {
          runId: String(latestRunRow.run_id),
          status: (toText(latestRunRow.status) ?? 'failed') as IcoLlmRunStatus,
          startedAt: String(latestRunRow.started_at),
          completedAt: toText(latestRunRow.completed_at)
        }
      : null,
    lastProcessedAt: toText(totalsRow.last_processed_at)
  }
}

export const readOrganizationAiLlmEnrichments = async (
  organizationId: string,
  limit = 3
): Promise<OrganizationAiLlmEnrichmentItem[]> => {
  const rows = await query<RawRow>(
    `
      SELECT enrich.*
      FROM greenhouse_serving.ico_ai_signal_enrichments enrich
      INNER JOIN greenhouse_core.spaces spaces
        ON spaces.space_id = enrich.space_id
      WHERE spaces.organization_id = $1
        AND spaces.active = TRUE
        AND enrich.status = 'succeeded'
      ORDER BY enrich.processed_at DESC, enrich.quality_score DESC NULLS LAST
      LIMIT $2
    `,
    [organizationId, limit]
  ).catch(() => [])

  return rows.map(mapOrganizationItem)
}

export const readTopAiLlmEnrichments = async (
  periodYear: number,
  periodMonth: number,
  limit = 3
): Promise<TopAiLlmEnrichmentItem[]> => {
  const rows = await query<RawRow>(
    `
      SELECT
        enrichment_id,
        signal_id,
        space_id,
        metric_name,
        signal_type,
        severity,
        quality_score,
        explanation_summary,
        recommended_action,
        confidence,
        processed_at
      FROM greenhouse_serving.ico_ai_signal_enrichments
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
  ).catch(() => [])

  return rows.map(mapTopItem)
}
