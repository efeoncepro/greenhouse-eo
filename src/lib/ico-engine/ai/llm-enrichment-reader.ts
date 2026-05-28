import 'server-only'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'

import type {
  AgencyAiLlmSummary,
  AgencyAiLlmSummaryItem,
  IcoLlmRunStatus,
  MemberNexaInsightItem,
  MemberNexaInsightsPayload,
  NexaSignalLifecycleStatus,
  NexaSignalObservation,
  OrganizationAiLlmEnrichmentItem,
  SpaceNexaInsightItem,
  SpaceNexaInsightsPayload,
  TopAiLlmEnrichmentItem
} from './llm-types'

type RawRow = Record<string, unknown>
type HistoricalTotalsRow = {
  total: unknown
  last_processed_at: unknown
}

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
  rootCauseNarrative: toText(row.root_cause_narrative),
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
  rootCauseNarrative: toText(row.root_cause_narrative),
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
  rootCauseNarrative: toText(row.root_cause_narrative),
  recommendedAction: toText(row.recommended_action),
  confidence: toNumber(row.confidence),
  processedAt: String(row.processed_at)
})

const mapMemberInsightItem = (row: RawRow): MemberNexaInsightItem => ({
  id: String(row.enrichment_id),
  signalType: String(row.signal_type),
  metricId: String(row.metric_name),
  severity: toText(row.severity),
  explanation: toText(row.explanation_summary),
  rootCauseNarrative: toText(row.root_cause_narrative),
  recommendedAction: toText(row.recommended_action),
  processedAt: String(row.processed_at),
  // TASK-945 — propaga signal_id canonical para enrichment con lifecycle
  // + deep link al detail page TASK-947 V1 cuando shippee.
  signalId: typeof row.signal_id === 'string' ? row.signal_id : undefined
})

const mapSpaceInsightItem = (row: RawRow): SpaceNexaInsightItem => ({
  id: String(row.enrichment_id),
  signalType: String(row.signal_type),
  metricId: String(row.metric_name),
  severity: toText(row.severity),
  explanation: toText(row.explanation_summary),
  rootCauseNarrative: toText(row.root_cause_narrative),
  recommendedAction: toText(row.recommended_action),
  processedAt: String(row.processed_at),
  // TASK-945 — propaga signal_id canonical (mismo pattern member)
  signalId: typeof row.signal_id === 'string' ? row.signal_id : undefined
})

// ─── TASK-945 — Helper canonical para enriquecer cualquier lista de items
// con lifecycle data. Single source of truth; usado por todos los readers.

const enrichInsightItemsWithLifecycle = async <T extends {
  signalId?: string
  lifecycle?: NexaSignalObservation[]
  lifecycleStatus?: NexaSignalLifecycleStatus
}>(items: T[], periodYear: number, periodMonth: number): Promise<T[]> => {
  const signalIds = Array.from(new Set(items.map(item => item.signalId).filter((id): id is string => Boolean(id))))

  if (signalIds.length === 0) return items

  const lifecycles = await readNexaSignalLifecycles(signalIds, periodYear, periodMonth)

  return items.map(item => {
    const entry = item.signalId ? lifecycles.get(item.signalId) : undefined

    if (!entry) return item

    return {
      ...item,
      lifecycle: entry.observations,
      lifecycleStatus: entry.status
    }
  })
}

const TIMELINE_DEFAULT_LIMIT = 20
const TIMELINE_MAX_LIMIT = 50
const ENRICHMENT_HISTORY_TABLE = 'greenhouse_serving.ico_ai_signal_enrichment_history'

const TIMELINE_SELECT_COLUMNS = `
  enrichment_id,
  signal_id,
  space_id,
  member_id,
  project_id,
  signal_type,
  metric_name,
  severity,
  quality_score,
  explanation_summary,
  root_cause_narrative,
  recommended_action,
  confidence,
  processed_at::text AS processed_at
`

const buildHistoricalTimelineQuery = (scopeSql: string) => `
  SELECT ${TIMELINE_SELECT_COLUMNS}
  FROM (
    SELECT DISTINCT ON (enrichment_id) *
    FROM ${ENRICHMENT_HISTORY_TABLE}
    WHERE ${scopeSql}
      AND status = 'succeeded'
    ORDER BY enrichment_id, processed_at DESC
  ) enrichments
  ORDER BY processed_at DESC
  LIMIT $2
`

const buildHistoricalTotalsQuery = (scopeSql: string) => `
  SELECT
    COUNT(DISTINCT enrichment_id) AS total,
    MAX(processed_at)::text AS last_processed_at
  FROM ${ENRICHMENT_HISTORY_TABLE}
  WHERE ${scopeSql}
    AND status = 'succeeded'
`

const buildScopedSummarySelection = <T extends { processedAt: string }>(
  activeTotalsRow: RawRow,
  historicalTotalsRow: HistoricalTotalsRow,
  activePreview: T[],
  historicalPreview: T[]
) => {
  const activeAnalyzed = Number(activeTotalsRow.succeeded ?? 0)
  const historicalAnalyzed = toNumber(historicalTotalsRow.total) ?? 0

  const summarySource =
    activeAnalyzed > 0 ? 'active' : historicalAnalyzed > 0 ? 'historical' : 'empty'

  const totalAnalyzed =
    summarySource === 'active' ? activeAnalyzed : summarySource === 'historical' ? historicalAnalyzed : 0

  const lastAnalysis =
    summarySource === 'active'
      ? toText(activeTotalsRow.last_processed_at)
      : summarySource === 'historical'
        ? toText(historicalTotalsRow.last_processed_at)
        : null

  const insights =
    summarySource === 'active'
      ? activePreview
      : summarySource === 'historical'
        ? historicalPreview
        : []

  return {
    summarySource,
    activeAnalyzed,
    historicalAnalyzed,
    totalAnalyzed,
    lastAnalysis,
    insights,
    activePreview,
    historicalPreview
  } as const
}

export const readAgencyAiLlmTimeline = async (
  limit = TIMELINE_DEFAULT_LIMIT
): Promise<AgencyAiLlmSummaryItem[]> => {
  const boundedLimit = Math.min(Math.max(Math.trunc(limit), 1), TIMELINE_MAX_LIMIT)

  const rows = await query<RawRow>(
    `
      SELECT ${TIMELINE_SELECT_COLUMNS}
      FROM (
        SELECT DISTINCT ON (enrichment_id) *
        FROM ${ENRICHMENT_HISTORY_TABLE}
        WHERE status = 'succeeded'
        ORDER BY enrichment_id, processed_at DESC
      ) enrichments
      ORDER BY processed_at DESC
      LIMIT $1
    `,
    [boundedLimit]
  ).catch(() => [])

  return rows.map(mapSummaryItem)
}

export const readAgencyAiLlmSummary = async (
  periodYear: number,
  periodMonth: number,
  limit = 8
): Promise<AgencyAiLlmSummary> => {
  const [totalsRows, recentRows, latestRunRows, timelineItems] = await Promise.all([
    query<RawRow>(
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
    ).catch(() => []),
    query<RawRow>(
      `
        SELECT *
        FROM greenhouse_serving.ico_ai_signal_enrichments
        WHERE period_year = $1
          AND period_month = $2
        ORDER BY processed_at DESC, quality_score DESC NULLS LAST
        LIMIT $3
      `,
      [periodYear, periodMonth, limit]
    ).catch(() => []),
    query<RawRow>(
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
    ).catch(() => []),
    readAgencyAiLlmTimeline(TIMELINE_DEFAULT_LIMIT).catch(() => [] as AgencyAiLlmSummaryItem[])
  ])

  const totalsRow = totalsRows[0] ?? {}
  const latestRunRow = latestRunRows[0]

  // TASK-945 — enriquece recentEnrichments con lifecycle (mismo pattern Member/Space).
  // mapSummaryItem ya incluye signalId via String(row.signal_id), por lo que el
  // helper canonical readNexaSignalLifecycles encuentra los signal_ids.
  const recentEnrichments = await enrichInsightItemsWithLifecycle(
    recentRows.map(mapSummaryItem),
    periodYear,
    periodMonth
  )

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
    recentEnrichments,
    timeline: timelineItems,
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

// ─── TASK-945 — Signal lifecycle canonical helper ──────────────────────────
//
// Lee de BQ `ico_engine.ai_signals` (raw append-only event log TASK-943) la
// historia completa de generations de los signal_ids del top-N para el periodo
// solicitado. NO usa la VIEW `ai_signals_current` (que filtra latest-per-signal)
// porque el lifecycle requiere TODAS las observaciones cronologicas del periodo.
//
// Cross-store deliberado: el reader principal de Insights es PG-based (lee
// `ico_ai_signal_enrichments` PG serving que tiene LLM enrichments). El lifecycle
// del SIGNAL (no del enrichment) vive en BQ append-only. Esta primitiva los une
// post-fetch sin acoplar.
//
// lifecycleStatus canonical derivado server-side:
//   - `active`   si el ultimo cron run del periodo todavia observo el signal
//   - `resolved` si la ultima observacion del signal es anterior al ultimo
//     cron run del periodo (semantica: "ya no se ve").
//
// Honest degradation: si BQ falla o el signal no tiene >= 2 observations,
// retorna `lifecycle: []`. El consumer UI (sparkline) NO renderiza con < 2 pts.
//
// Performance: top-N suele ser 3-10 signals × 30 obs cap = 90-300 BQ rows.
// Una sola query (NO N+1). Cache HTTP en endpoint canonical 60s suficiente.

const LIFECYCLE_OBSERVATIONS_PER_SIGNAL_LIMIT = 30

export interface NexaSignalLifecycleEntry {
  observations: NexaSignalObservation[]
  status: NexaSignalLifecycleStatus
}

export const readNexaSignalLifecycles = async (
  signalIds: string[],
  periodYear: number,
  periodMonth: number
): Promise<Map<string, NexaSignalLifecycleEntry>> => {
  const result = new Map<string, NexaSignalLifecycleEntry>()

  if (signalIds.length === 0) {
    return result
  }

  try {
    const projectId = getBigQueryProjectId()
    const bigQuery = getBigQueryClient()

    const [rows] = await bigQuery.query({
      query: `
        WITH period_signals AS (
          SELECT
            signal_id,
            generated_at,
            severity,
            current_value
          FROM \`${projectId}.ico_engine.ai_signals\`
          WHERE period_year = @periodYear
            AND period_month = @periodMonth
            AND signal_id IN UNNEST(@signalIds)
        ),
        latest_run AS (
          SELECT MAX(generated_at) AS run_at
          FROM \`${projectId}.ico_engine.ai_signals\`
          WHERE period_year = @periodYear
            AND period_month = @periodMonth
        ),
        ranked AS (
          SELECT
            signal_id,
            generated_at,
            severity,
            current_value,
            ROW_NUMBER() OVER (PARTITION BY signal_id ORDER BY generated_at ASC) AS asc_rn,
            ROW_NUMBER() OVER (PARTITION BY signal_id ORDER BY generated_at DESC) AS desc_rn
          FROM period_signals
        )
        SELECT
          r.signal_id,
          r.generated_at,
          r.severity,
          r.current_value,
          r.asc_rn,
          MAX(r.desc_rn = 1) OVER (PARTITION BY r.signal_id) AS is_last,
          (SELECT run_at FROM latest_run) AS latest_run_at
        FROM ranked r
        WHERE r.asc_rn <= @perSignalLimit
        ORDER BY r.signal_id, r.generated_at ASC
      `,
      params: {
        periodYear,
        periodMonth,
        signalIds,
        perSignalLimit: LIFECYCLE_OBSERVATIONS_PER_SIGNAL_LIMIT
      },
      types: {
        periodYear: 'INT64',
        periodMonth: 'INT64',
        signalIds: ['STRING'],
        perSignalLimit: 'INT64'
      }
    })

    interface BqLifecycleRow {
      signal_id?: string | null
      generated_at?: string | { value?: string } | null
      severity?: string | null
      current_value?: number | string | null
      latest_run_at?: string | { value?: string } | null
    }

    const toIso = (value: BqLifecycleRow['generated_at']): string => {
      if (typeof value === 'string') return value
      if (value && typeof value === 'object' && 'value' in value && typeof value.value === 'string') return value.value

      return ''
    }

    const toCurrentValue = (value: BqLifecycleRow['current_value']): number | null => {
      if (typeof value === 'number') return Number.isFinite(value) ? value : null

      if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value)

        return Number.isFinite(parsed) ? parsed : null
      }

      return null
    }

    const observationsBySignal = new Map<string, NexaSignalObservation[]>()
    let latestRunAt: string | null = null

    for (const raw of (rows as BqLifecycleRow[])) {
      const signalId = typeof raw.signal_id === 'string' ? raw.signal_id : null

      if (!signalId) continue

      latestRunAt = latestRunAt ?? (toIso(raw.latest_run_at) || null)

      const list = observationsBySignal.get(signalId) ?? []

      list.push({
        generatedAt: toIso(raw.generated_at),
        severity: typeof raw.severity === 'string' ? raw.severity : null,
        currentValue: toCurrentValue(raw.current_value)
      })

      observationsBySignal.set(signalId, list)
    }

    for (const [signalId, observations] of observationsBySignal) {
      const lastObservation = observations[observations.length - 1]

      const status: NexaSignalLifecycleStatus =
        lastObservation && latestRunAt && lastObservation.generatedAt < latestRunAt
          ? 'resolved'
          : 'active'

      result.set(signalId, { observations, status })
    }
  } catch (error) {
    captureWithDomain(error, 'delivery', {
      tags: { source: 'nexa_signal_lifecycles', stage: 'bq_read' }
    })
  }

  return result
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
        root_cause_narrative,
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

  const items = rows.map(mapTopItem)

  // TASK-945 — enriquece con lifecycle desde BQ append-only event log
  // (TASK-943). Honest degradation: si BQ falla o signal sin observaciones,
  // `lifecycle` no se setea y el consumer UI degrada sin sparkline.
  const signalIds = Array.from(new Set(items.map(item => item.signalId).filter(Boolean)))

  if (signalIds.length === 0) {
    return items
  }

  const lifecycles = await readNexaSignalLifecycles(signalIds, periodYear, periodMonth)

  return items.map(item => {
    const entry = lifecycles.get(item.signalId)

    if (!entry) return item

    return {
      ...item,
      lifecycle: entry.observations,
      lifecycleStatus: entry.status
    }
  })
}

export const readMemberAiLlmTimeline = async (
  memberId: string,
  limit = TIMELINE_DEFAULT_LIMIT
): Promise<MemberNexaInsightItem[]> => {
  const boundedLimit = Math.min(Math.max(Math.trunc(limit), 1), TIMELINE_MAX_LIMIT)

  const rows = await query<RawRow>(
    buildHistoricalTimelineQuery('member_id = $1'),
    [memberId, boundedLimit]
  ).catch(() => [])

  return rows.map(mapMemberInsightItem)
}

export const readSpaceAiLlmTimeline = async (
  spaceId: string,
  limit = TIMELINE_DEFAULT_LIMIT
): Promise<SpaceNexaInsightItem[]> => {
  const boundedLimit = Math.min(Math.max(Math.trunc(limit), 1), TIMELINE_MAX_LIMIT)

  const rows = await query<RawRow>(
    buildHistoricalTimelineQuery('space_id = $1'),
    [spaceId, boundedLimit]
  ).catch(() => [])

  return rows.map(mapSpaceInsightItem)
}

export const readMemberAiLlmSummary = async (
  memberId: string,
  periodYear: number,
  periodMonth: number,
  limit = 3
): Promise<MemberNexaInsightsPayload> => {
  const [totalsRows, historicalTotalsRows, recentRows, latestRunRows, timelineItems] = await Promise.all([
    query<RawRow>(
      `
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status = 'succeeded') AS succeeded,
          COUNT(*) FILTER (WHERE status = 'failed') AS failed,
          AVG(quality_score) FILTER (WHERE status = 'succeeded') AS avg_quality_score,
          MAX(processed_at)::text AS last_processed_at
        FROM greenhouse_serving.ico_ai_signal_enrichments
        WHERE member_id = $1
          AND period_year = $2
          AND period_month = $3
      `,
      [memberId, periodYear, periodMonth]
    ).catch(() => []),
    query<HistoricalTotalsRow>(
      buildHistoricalTotalsQuery('member_id = $1'),
      [memberId]
    ).catch(() => []),
    query<RawRow>(
      `
        SELECT
          enrichment_id,
          signal_id,
          signal_type,
          metric_name,
          severity,
          explanation_summary,
          root_cause_narrative,
          recommended_action,
          quality_score,
          processed_at
        FROM greenhouse_serving.ico_ai_signal_enrichments
        WHERE member_id = $1
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
      [memberId, periodYear, periodMonth, limit]
    ).catch(() => []),
    query<RawRow>(
      `
        SELECT
          run_id,
          status,
          started_at::text AS started_at,
          completed_at::text AS completed_at
        FROM greenhouse_serving.ico_ai_enrichment_runs
        WHERE period_year = $1
          AND period_month = $2
        ORDER BY started_at DESC
        LIMIT 1
      `,
      [periodYear, periodMonth]
    ).catch(() => []),
    readMemberAiLlmTimeline(memberId, TIMELINE_DEFAULT_LIMIT).catch(
      () => [] as MemberNexaInsightItem[]
    )
  ])

  const totalsRow = totalsRows[0] ?? {}
  const historicalTotalsRow = historicalTotalsRows[0] ?? { total: 0, last_processed_at: null }
  const latestRunRow = latestRunRows[0]

  // TASK-945 — enriquece con lifecycle ANTES de buildScopedSummarySelection
  // para que insights / activePreview heredados ya tengan lifecycle data.
  const activePreview = await enrichInsightItemsWithLifecycle(
    recentRows.map(mapMemberInsightItem),
    periodYear,
    periodMonth
  )

  const historicalPreview = timelineItems.slice(0, Math.max(1, limit))

  const scopedSummary = buildScopedSummarySelection(
    totalsRow,
    historicalTotalsRow,
    activePreview,
    historicalPreview
  )

  return {
    summarySource: scopedSummary.summarySource,
    activeAnalyzed: scopedSummary.activeAnalyzed,
    historicalAnalyzed: scopedSummary.historicalAnalyzed,
    totalAnalyzed: scopedSummary.totalAnalyzed,
    lastAnalysis: scopedSummary.lastAnalysis,
    runStatus: latestRunRow
      ? (toText(latestRunRow.status) ?? 'failed') as IcoLlmRunStatus
      : null,
    insights: scopedSummary.insights,
    activePreview: scopedSummary.activePreview,
    historicalPreview: scopedSummary.historicalPreview,
    timeline: timelineItems
  }
}

export const readSpaceAiLlmSummary = async (
  spaceId: string,
  periodYear: number,
  periodMonth: number,
  limit = 3
): Promise<SpaceNexaInsightsPayload> => {
  const [totalsRows, historicalTotalsRows, recentRows, latestRunRows, timelineItems] = await Promise.all([
    query<RawRow>(
      `
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status = 'succeeded') AS succeeded,
          COUNT(*) FILTER (WHERE status = 'failed') AS failed,
          AVG(quality_score) FILTER (WHERE status = 'succeeded') AS avg_quality_score,
          MAX(processed_at)::text AS last_processed_at
        FROM greenhouse_serving.ico_ai_signal_enrichments
        WHERE space_id = $1
          AND period_year = $2
          AND period_month = $3
      `,
      [spaceId, periodYear, periodMonth]
    ).catch(() => []),
    query<HistoricalTotalsRow>(
      buildHistoricalTotalsQuery('space_id = $1'),
      [spaceId]
    ).catch(() => []),
    query<RawRow>(
      `
        SELECT
          enrichment_id,
          signal_id,
          signal_type,
          metric_name,
          severity,
          explanation_summary,
          root_cause_narrative,
          recommended_action,
          quality_score,
          processed_at
        FROM greenhouse_serving.ico_ai_signal_enrichments
        WHERE space_id = $1
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
      [spaceId, periodYear, periodMonth, limit]
    ).catch(() => []),
    query<RawRow>(
      `
        SELECT
          run_id,
          status,
          started_at::text AS started_at,
          completed_at::text AS completed_at
        FROM greenhouse_serving.ico_ai_enrichment_runs
        WHERE space_id = $1
          AND period_year = $2
          AND period_month = $3
        ORDER BY started_at DESC
        LIMIT 1
      `,
      [spaceId, periodYear, periodMonth]
    ).catch(() => []),
    readSpaceAiLlmTimeline(spaceId, TIMELINE_DEFAULT_LIMIT).catch(
      () => [] as SpaceNexaInsightItem[]
    )
  ])

  const totalsRow = totalsRows[0] ?? {}
  const historicalTotalsRow = historicalTotalsRows[0] ?? { total: 0, last_processed_at: null }
  const latestRunRow = latestRunRows[0]

  // TASK-945 — enriquece con lifecycle (pattern member reader)
  const activePreview = await enrichInsightItemsWithLifecycle(
    recentRows.map(mapSpaceInsightItem),
    periodYear,
    periodMonth
  )

  const historicalPreview = timelineItems.slice(0, Math.max(1, limit))

  const scopedSummary = buildScopedSummarySelection(
    totalsRow,
    historicalTotalsRow,
    activePreview,
    historicalPreview
  )

  return {
    summarySource: scopedSummary.summarySource,
    activeAnalyzed: scopedSummary.activeAnalyzed,
    historicalAnalyzed: scopedSummary.historicalAnalyzed,
    totalAnalyzed: scopedSummary.totalAnalyzed,
    lastAnalysis: scopedSummary.lastAnalysis,
    runStatus: latestRunRow
      ? (toText(latestRunRow.status) ?? 'failed') as IcoLlmRunStatus
      : null,
    insights: scopedSummary.insights,
    activePreview: scopedSummary.activePreview,
    historicalPreview: scopedSummary.historicalPreview,
    timeline: timelineItems
  }
}
