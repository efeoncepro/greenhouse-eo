import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'

// ─── TASK-947 — Nexa Insights detail drill reader canonical ─────────────────
//
// Helper único reusable cross-surface (Home/Agency/Person 360/Space 360/Finance
// — y futuras superficies) que resuelve un Nexa Insight por ID con dispatch
// prefix canonical:
//
//   - `EO-AIS-*`  → signal-anchored: lookup en `greenhouse_serving.ico_ai_signals`
//                   PG serving (current) → resolve latest enrichment via
//                   `ico_ai_signal_enrichments`. Estable cross-period (TASK-943
//                   append-only). Default para cards "Ver causa raíz" del current.
//   - `EO-AIE-*`  → enrichment-anchored: 3-tier lookup
//                   `ico_ai_signal_enrichments` (current PG serving) → fallback
//                   `ico_ai_signal_enrichment_history` (TASK-914 history) → notFound.
//                   Snapshot específico (correcto para share permalinks TASK-449).
//   - `EO-AIH-*`  → enrichment-history forensic: lookup directo en
//                   `ico_ai_signal_enrichment_history` por `history_id`.
//
// Subject-aware filter: si subject NO es EFEONCE_ADMIN y NO tiene visibilidad
// del space_id/member_id del insight → `state: 'not_found'`. Anti-oracle TASK-872
// pattern: NUNCA 403 leakeando existencia; el page upstream traduce el `not_found`
// a `notFound()` semánticamente indistinguible de "no existe".
//
// Discriminated union return (single source of truth para UI consumer):
//   - `current`     — enrichment del current PG serving + signal vigente.
//   - `superseded`  — enrichment del history, hay un current más nuevo para el
//                     mismo signal_id. Banner amber + link al signal_id current.
//   - `expired`     — signal resolved (no aparece en `ico_ai_signals` current).
//                     "Anomalía resuelta. Sin acción pendiente." (TASK-946
//                     `empty-positive` state).
//   - `not_found`   — ID con shape canonical pero sin row (deleted, never existed,
//                     subject sin acceso). Page hace `notFound()`.
//   - `degraded`    — read parcial; signal canonical alerta upstream. Render
//                     parcial con disclaimer (TASK-946 `stale-degraded`).
//
// Reglas duras (CLAUDE.md "Nexa AI Signals append-only event log invariants"):
// - NUNCA read directo de `ico_engine.ai_signals` raw BQ. Lee de la VIEW
//   canonical `ico_signals_current` (PG serving snapshot) via consumers de
//   TASK-943 — aquí leemos del PG serving table `ico_ai_signals` que la
//   projection reactiva mantiene.
// - NUNCA bypass del filter subject-aware. El page upstream confía en este
//   return para decidir notFound().

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

// ─── ID prefix detection canonical ─────────────────────────────────────────

export const NEXA_ID_PREFIXES = {
  ICO_SIGNAL: 'EO-AIS-',
  ICO_ENRICHMENT: 'EO-AIE-',
  ICO_ENRICHMENT_HISTORY: 'EO-AIH-'
} as const

export type NexaIdKind = 'signal' | 'enrichment' | 'enrichment_history' | 'unknown'

export const detectNexaIdKind = (id: string): NexaIdKind => {
  if (!id || typeof id !== 'string') return 'unknown'
  const trimmed = id.trim()

  if (trimmed.startsWith(NEXA_ID_PREFIXES.ICO_SIGNAL)) return 'signal'
  if (trimmed.startsWith(NEXA_ID_PREFIXES.ICO_ENRICHMENT)) return 'enrichment'
  if (trimmed.startsWith(NEXA_ID_PREFIXES.ICO_ENRICHMENT_HISTORY)) return 'enrichment_history'

  return 'unknown'
}

// ─── Public result shape canonical (discriminated union) ────────────────────

/**
 * Snapshot canonical de un Nexa Insight presentable a UI. Mapea el row PG
 * serving a campos camelCase listos para render (sin secrets internos).
 */
export interface NexaInsightDetailSnapshot {
  enrichmentId: string
  signalId: string
  signalType: string
  metricName: string
  severity: string | null
  qualityScore: number | null
  confidence: number | null
  explanationSummary: string | null
  rootCauseNarrative: string | null
  recommendedAction: string | null
  processedAt: string
  spaceId: string | null
  memberId: string | null
  projectId: string | null
  periodYear: number | null
  periodMonth: number | null
}

export type NexaInsightDrillResult =
  | { state: 'current'; insight: NexaInsightDetailSnapshot }
  | {
      state: 'superseded'
      insight: NexaInsightDetailSnapshot
      currentSignalDrillId: string | null
    }
  | {
      state: 'expired'
      insight: NexaInsightDetailSnapshot
      resolvedAt: string | null
    }
  | { state: 'not_found' }
  | { state: 'degraded'; reason: NexaInsightDrillDegradedReason; partial: NexaInsightDetailSnapshot | null }

export type NexaInsightDrillDegradedReason =
  | 'pg_read_failed'
  | 'history_unavailable'
  | 'pg_stale'

/**
 * Subject mínimo que necesita el reader (extracto de `TenantEntitlementSubject`).
 * Mantener el shape lo más estrecho posible facilita test fixtures y evita
 * acoplamiento al tipo completo de NextAuth.
 */
export interface NexaInsightDrillSubject {
  userId: string
  tenantType: 'client' | 'efeonce_internal'
  roleCodes: readonly string[]
  routeGroups: readonly string[]
  memberId?: string | null
}

// ─── Row mapping helpers ────────────────────────────────────────────────────

/**
 * TASK-950 — Exportado canonical para reuso desde `nexa-insight-list-reader.ts`
 * (list page sibling). Single source of truth: el row → snapshot mapping de
 * `ico_ai_signal_enrichments` vive solo acá. Cero drift cross-reader.
 */
export const mapEnrichmentRow = (row: RawRow): NexaInsightDetailSnapshot => ({
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

// ─── Subject-aware authorization ────────────────────────────────────────────

/**
 * TASK-950 — Exportado canonical para reuso desde sibling readers (list, future
 * surfaces). Mismo concepto cross-reader: matchea contra `ROLE_CODES.EFEONCE_ADMIN`.
 */
export const isEfeonceAdmin = (subject: NexaInsightDrillSubject): boolean =>
  subject.roleCodes.includes('efeonce_admin')

/**
 * TASK-950 — Exportado canonical para reuso desde sibling readers. Operational
 * broad access (route_groups internal/finance/hr).
 */
export const hasInternalRouteGroup = (subject: NexaInsightDrillSubject): boolean =>
  subject.routeGroups.includes('internal') ||
  subject.routeGroups.includes('finance') ||
  subject.routeGroups.includes('hr')

/**
 * Decide si el subject tiene acceso al insight según su scope.
 *
 * Reglas canonical V1:
 *  - EFEONCE_ADMIN → siempre permitido (super-admin).
 *  - Subject con route_group `internal|finance|hr` → permitido a nivel tenant
 *    (acceso operacional broad). El insight se considera del tenant interno
 *    cuando `space_id` está poblado (Greenhouse internal insights son
 *    space-scoped por design TASK-941).
 *  - Subject internal sin route_group broad → solo el insight cuyo `member_id`
 *    matchee `subject.memberId` (self-access).
 *  - Subject `tenantType=client` → V1 sin acceso (capability scope `tenant` =
 *    internal-only, spec Out of Scope V1 línea 196).
 *
 * NUNCA 403: si false → caller retorna `state: 'not_found'`. Anti-oracle.
 *
 * TASK-950 — Exportado canonical para reuso desde `nexa-insight-list-reader.ts`.
 * Single source of truth: el subject-aware filter vive solo acá; siblings
 * importan + reusan (cero divergencia cross-reader, blast radius dual).
 */
export const subjectCanReadInsight = (
  subject: NexaInsightDrillSubject,
  insight: NexaInsightDetailSnapshot
): boolean => {
  // Anti-oracle: client tenants nunca acceden al detail V1.
  if (subject.tenantType !== 'efeonce_internal') return false

  if (isEfeonceAdmin(subject)) return true

  if (hasInternalRouteGroup(subject)) return true

  // Fallback: self-access por member_id (collaborator viendo su propio insight).
  if (subject.memberId && insight.memberId && subject.memberId === insight.memberId) {
    return true
  }

  return false
}

// ─── PG serving readers (low-level) ────────────────────────────────────────

const fetchEnrichmentById = async (
  enrichmentId: string
): Promise<NexaInsightDetailSnapshot | null> => {
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
      WHERE enrichment_id = $1
        AND status = 'succeeded'
      LIMIT 1
    `,
    [enrichmentId]
  )

  return rows[0] ? mapEnrichmentRow(rows[0]) : null
}

const fetchEnrichmentBySignalId = async (
  signalId: string
): Promise<NexaInsightDetailSnapshot | null> => {
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
      WHERE signal_id = $1
        AND status = 'succeeded'
      ORDER BY processed_at DESC, quality_score DESC NULLS LAST
      LIMIT 1
    `,
    [signalId]
  )

  return rows[0] ? mapEnrichmentRow(rows[0]) : null
}

const fetchEnrichmentFromHistoryById = async (
  enrichmentId: string
): Promise<NexaInsightDetailSnapshot | null> => {
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
      FROM greenhouse_serving.ico_ai_signal_enrichment_history
      WHERE enrichment_id = $1
      ORDER BY processed_at DESC
      LIMIT 1
    `,
    [enrichmentId]
  )

  return rows[0] ? mapEnrichmentRow(rows[0]) : null
}

const fetchEnrichmentFromHistoryByHistoryId = async (
  historyId: string
): Promise<NexaInsightDetailSnapshot | null> => {
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
      FROM greenhouse_serving.ico_ai_signal_enrichment_history
      WHERE history_id = $1
      LIMIT 1
    `,
    [historyId]
  )

  return rows[0] ? mapEnrichmentRow(rows[0]) : null
}

const isSignalStillActive = async (signalId: string): Promise<boolean> => {
  const rows = await query<{ signal_id: string }>(
    `
      SELECT signal_id
      FROM greenhouse_serving.ico_ai_signals
      WHERE signal_id = $1
      LIMIT 1
    `,
    [signalId]
  )

  return rows.length > 0
}

// ─── Public canonical reader ────────────────────────────────────────────────

/**
 * Resuelve un Nexa Insight por ID + dispatch prefix + subject-aware filter.
 *
 * Single source of truth canonical: cero recompute inline en consumers. Si
 * emerge una surface nueva que necesite "detail de un Nexa Insight", DEBE
 * llamar a este helper (CLAUDE.md TASK-947 hard rules canonical).
 *
 * El page upstream NUNCA debe retornar 403 cuando el state es `not_found`. La
 * semántica `not_found` cubre 4 casos indistinguibles para el atacante:
 *  - ID con shape válido pero sin row en DB.
 *  - ID con shape inválido.
 *  - Subject sin acceso al insight encontrado.
 *  - Tenant type cliente externo (out-of-scope V1).
 */
export const readNexaInsightDrill = async (
  id: string,
  subject: NexaInsightDrillSubject
): Promise<NexaInsightDrillResult> => {
  const kind = detectNexaIdKind(id)

  if (kind === 'unknown') {
    return { state: 'not_found' }
  }

  try {
    if (kind === 'signal') {
      const insight = await fetchEnrichmentBySignalId(id)

      if (!insight) {
        return { state: 'not_found' }
      }

      if (!subjectCanReadInsight(subject, insight)) {
        return { state: 'not_found' }
      }

      const signalActive = await isSignalStillActive(id).catch(() => null)

      if (signalActive === false) {
        return {
          state: 'expired',
          insight,
          resolvedAt: insight.processedAt
        }
      }

      return { state: 'current', insight }
    }

    if (kind === 'enrichment') {
      // Tier 1: current PG serving.
      const current = await fetchEnrichmentById(id)

      if (current) {
        if (!subjectCanReadInsight(subject, current)) {
          return { state: 'not_found' }
        }

        return { state: 'current', insight: current }
      }

      // Tier 2: history fallback.
      const historical = await fetchEnrichmentFromHistoryById(id)

      if (!historical) {
        return { state: 'not_found' }
      }

      if (!subjectCanReadInsight(subject, historical)) {
        return { state: 'not_found' }
      }

      // Determinar si hay un current vigente para el mismo signal_id → superseded.
      const currentForSignal = await fetchEnrichmentBySignalId(historical.signalId).catch(
        () => null
      )

      return {
        state: 'superseded',
        insight: historical,
        currentSignalDrillId: currentForSignal ? historical.signalId : null
      }
    }

    // kind === 'enrichment_history' (forensic share)
    const forensic = await fetchEnrichmentFromHistoryByHistoryId(id)

    if (!forensic) {
      return { state: 'not_found' }
    }

    if (!subjectCanReadInsight(subject, forensic)) {
      return { state: 'not_found' }
    }

    const currentForSignal = await fetchEnrichmentBySignalId(forensic.signalId).catch(() => null)

    return {
      state: 'superseded',
      insight: forensic,
      currentSignalDrillId: currentForSignal ? forensic.signalId : null
    }
  } catch (error) {
    captureWithDomain(error, 'delivery', {
      tags: { source: 'nexa_insight_detail', stage: 'pg_read' },
      extra: { idKind: kind }
    })

    return { state: 'degraded', reason: 'pg_read_failed', partial: null }
  }
}

/**
 * Helper canonical para construir el drillHref desde un signalId.
 * Mantener el shape de URL centralizado evita drift cross-surface.
 */
export const buildNexaInsightDrillHref = (id: string): string => `/nexa/insights/${id}`
