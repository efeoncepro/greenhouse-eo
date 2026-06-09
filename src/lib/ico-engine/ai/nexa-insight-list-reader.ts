import 'server-only'

import { GH_NEXA } from '@/lib/copy/nexa'
import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'

import {
  hasInternalRouteGroup,
  isEfeonceAdmin,
  type NexaInsightDetailSnapshot,
  type NexaInsightDrillSubject
} from './nexa-insight-drill-reader'

// ─── TASK-950 — Nexa Insights list reader canonical ────────────────────────
//
// Helper único reusable cross-surface (Home V2 "Ver todos los insights del
// mes", futuras superficies Finance/Person/Space "ver lista") que resuelve
// los Nexa Insights del período actual con subject-aware filter SQL +
// honest degradation + discriminated union return.
//
// Sibling del `readNexaInsightDrill` (TASK-947). Comparten:
//   - Tipos (NexaInsightDetailSnapshot, NexaInsightDrillSubject)
//   - Subject helpers (isEfeonceAdmin, hasInternalRouteGroup)
//   - Row mapping (mapEnrichmentRow no se reutiliza directo porque la query
//     usa columnas con alias prefijo `e.`, pero el shape final es idéntico)
//
// Pattern fuente: TASK-947 nexa-insight-drill-reader.ts.
// Single source of truth: la matriz subject-aware vive en drill-reader y este
// helper la importa. Cero divergencia cross-reader.
//
// Reglas duras (CLAUDE.md "Nexa Insights detail page canonical invariants"):
// - NUNCA read directo de raw BQ `ico_engine.ai_signals`. Pasa por PG serving.
// - NUNCA bypass del filter subject-aware. SQL es la primera capa; TS post-
//   filter validation es la segunda (defense in depth dual).
// - NUNCA 403. State 'empty-positive' cuando subject sin acceso → mismo
//   render que "cero anomalías del período" (anti-oracle TASK-872).

type RawRow = Record<string, unknown>

const toText = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value : null

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

const mapListRow = (row: RawRow): NexaInsightDetailSnapshot => ({
  enrichmentId: String(row.enrichment_id ?? ''),
  signalId: String(row.signal_id ?? ''),
  signalType: String(row.signal_type ?? ''),
  metricName: String(row.metric_name ?? ''),
  severity: toText(row.severity),
  qualityScore: toNumber(row.quality_score),
  confidence: toNumber(row.confidence),
  explanationSummary: toText(row.explanation_summary),
  rootCauseNarrative: toText(row.root_cause_narrative),
  recommendedAction: toText(row.recommended_action),
  processedAt: String(row.processed_at ?? ''),
  spaceId: toText(row.space_id),
  memberId: toText(row.member_id),
  projectId: toText(row.project_id),
  periodYear: toNumber(row.period_year),
  periodMonth: toNumber(row.period_month)
})

// ─── Public result shape canonical (discriminated union) ────────────────────

export interface NexaInsightListInput {
  /** Año del período observado. */
  periodYear: number
  /** Mes (1-12) del período observado. */
  periodMonth: number
  /** Cap canonical V1 = 24. Override solo para tests. */
  limit?: number
}

export type NexaInsightListResult =
  | {
      state: 'ready'
      insights: NexaInsightDetailSnapshot[]
      totalCount: number
      periodLabel: string
    }
  | {
      state: 'empty-positive'
      periodLabel: string
    }
  | {
      state: 'degraded'
      reason: 'pg_read_failed'
    }

export type NexaInsightListRenderableResult = NexaInsightListResult

const DEFAULT_LIMIT = 24

// es-CL canonical via microcopy helper ("mayo 2026" lowercase) — single source
// of truth de format. NO recompute inline en consumers.
const buildPeriodLabel = (year: number, month: number): string =>
  GH_NEXA.list_period_format(year, month)

// ─── Public canonical reader ────────────────────────────────────────────────

/**
 * Resuelve la lista de Nexa Insights del período + subject-aware filter SQL.
 *
 * Single source of truth canonical: cero recompute inline en consumers. Si
 * emerge una surface nueva que necesite "lista de insights del período",
 * DEBE llamar este helper.
 *
 * Subject-aware filter (defense in depth dual: SQL primary + TS secondary):
 *  - Client tenant → SIEMPRE state `empty-positive` (early return, cero query).
 *    Anti-oracle TASK-872: indistinguible para client de "no hay anomalías".
 *  - Internal admin / route_group broad → todos los enrichments del período.
 *  - Collaborator sin route_group broad → solo enrichments cuyo `member_id`
 *    matchee `subject.memberId` (self-access). SQL `WHERE member_id = $X`.
 *
 * Honest degradation:
 *  - PG fail → state `degraded` + `captureWithDomain('delivery')`.
 *  - El page upstream consume el state y muestra Alert + link a /admin/ops-health.
 */
export const listNexaInsightsForPeriod = async (
  subject: NexaInsightDrillSubject,
  input: NexaInsightListInput
): Promise<NexaInsightListResult> => {
  const { periodYear, periodMonth } = input
  const limit = input.limit ?? DEFAULT_LIMIT
  const periodLabel = buildPeriodLabel(periodYear, periodMonth)

  // Anti-oracle: client tenants nunca acceden al list V1.
  if (subject.tenantType !== 'efeonce_internal') {
    return { state: 'empty-positive', periodLabel }
  }

  const isAdminOrBroad = isEfeonceAdmin(subject) || hasInternalRouteGroup(subject)
  const memberIdSelf = !isAdminOrBroad && subject.memberId ? subject.memberId : null

  // Si no es admin/broad Y no tiene memberId → cero acceso. Anti-oracle:
  // mismo render que "cero anomalías" (no leakea capability denial).
  if (!isAdminOrBroad && !memberIdSelf) {
    return { state: 'empty-positive', periodLabel }
  }

  try {
    const rows = await query<RawRow>(
      `
        SELECT
          enrichment_id,
          signal_id,
          signal_type,
          metric_name,
          severity,
          quality_score,
          confidence,
          explanation_summary,
          root_cause_narrative,
          recommended_action,
          processed_at,
          space_id,
          member_id,
          project_id,
          period_year,
          period_month
        FROM greenhouse_serving.ico_ai_signal_enrichments
        WHERE period_year = $1
          AND period_month = $2
          AND status = 'succeeded'
          AND (
            $3::boolean = TRUE
            OR ($4::text IS NOT NULL AND member_id = $4)
          )
        ORDER BY
          CASE COALESCE(severity, '')
            WHEN 'critical' THEN 0
            WHEN 'warning' THEN 1
            WHEN 'info' THEN 2
            ELSE 3
          END ASC,
          quality_score DESC NULLS LAST,
          processed_at DESC
        LIMIT $5
      `,
      [periodYear, periodMonth, isAdminOrBroad, memberIdSelf, limit]
    )

    const insights = rows.map(mapListRow)

    if (insights.length === 0) {
      return { state: 'empty-positive', periodLabel }
    }

    return {
      state: 'ready',
      insights,
      totalCount: insights.length,
      periodLabel
    }
  } catch (error) {
    captureWithDomain(error, 'delivery', {
      tags: { source: 'nexa_insight_list', stage: 'pg_read' },
      extra: { periodYear, periodMonth }
    })

    return { state: 'degraded', reason: 'pg_read_failed' }
  }
}
