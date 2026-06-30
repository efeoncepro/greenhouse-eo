import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'

import type { NexaInsightsDataStatus } from '@/lib/ico-engine/ai/nexa-data-status'

// ─── TASK-946 / TASK-1201 — Nexa Insights honest degradation: Finance variant ──
//
// Finance no consume el event log append-only BQ de TASK-943 (signals viven en
// `finance_ai_signals` PG, enrichments en `finance_ai_signal_enrichments` PG).
// Esta variant resuelve `dataStatus` desde PG serving.
//
// TASK-1201 — corrección de honestidad: `lastCronRun` ahora se lee de la
// provenance del ANOMALY STEP (`finance_ai_materialization_runs`), NO de
// `finance_ai_enrichment_runs`. El enrichment SOLO corre cuando hay señales
// (`signalsWritten > 0`), así que un período sano sin anomalías no dejaba run de
// enrichment → el reader mentía `empty-pending` ("el cron no corrió") cuando la
// verdad era `empty-positive`. La materialización SIEMPRE deja provenance.
// Además `snapshots_evaluated` distingue "economics elegible, sin anomalías"
// (empty-positive) de "economics no listo / upstream TASK-1200" (empty-pending).
//
// Pipeline de decisión (SoT: GREENHOUSE_FINANCE_AI_SIGNAL_SOURCE_OF_TRUTH_DECISION_V1.md):
//
//   1. insightsCount > 0                          → ready
//   2. lastMaterializationRun === null            → empty-pending (nunca corrió)
//   3. lastMaterializationRun > 24h ago           → stale-degraded
//   4. snapshotsEvaluated === 0                   → empty-pending (economics no listo)
//   5. eligibleSignalCount === 0                  → empty-positive (corrió, sin anomalías)
//   6. eligibleSignalCount > 0 && insights === 0  → stale-degraded (señales sin enrichment)
//   7. fallback                                   → empty-pending

const STALE_THRESHOLD_HOURS = 24

export interface ResolveFinanceNexaInsightsDataStatusInput {
  insightsCount: number
  periodYear: number
  periodMonth: number
}

interface FinanceStatusRow extends Record<string, unknown> {
  last_run_at: string | null
  eligible_count: number | string | null
  snapshots_evaluated: number | string | null
}

const toCount = (value: number | string | null): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0

  if (typeof value === 'string') {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

export const resolveFinanceNexaInsightsDataStatus = async (
  input: ResolveFinanceNexaInsightsDataStatusInput
): Promise<NexaInsightsDataStatus> => {
  const { insightsCount, periodYear, periodMonth } = input

  // Fast path: ya hay insights → ready inmediato.
  if (insightsCount > 0) {
    return 'ready'
  }

  try {
    const rows = await query<FinanceStatusRow>(
      `
        WITH last_run AS (
          SELECT started_at, snapshots_evaluated
          FROM greenhouse_serving.finance_ai_materialization_runs
          WHERE period_year = $1
            AND period_month = $2
          ORDER BY started_at DESC
          LIMIT 1
        ),
        eligible AS (
          SELECT COUNT(*) AS eligible_count
          FROM greenhouse_serving.finance_ai_signals
          WHERE period_year = $1
            AND period_month = $2
        )
        SELECT
          (SELECT started_at::text FROM last_run) AS last_run_at,
          (SELECT snapshots_evaluated FROM last_run) AS snapshots_evaluated,
          eligible.eligible_count
        FROM eligible
      `,
      [periodYear, periodMonth]
    )

    const row = rows[0]
    const lastRunAtIso = row?.last_run_at ?? null
    const eligibleCount = toCount(row?.eligible_count ?? null)
    const snapshotsEvaluated = toCount(row?.snapshots_evaluated ?? null)

    if (!lastRunAtIso) {
      return 'empty-pending'
    }

    const lastRunAtMs = new Date(lastRunAtIso).getTime()

    if (!Number.isFinite(lastRunAtMs)) {
      return 'empty-pending'
    }

    const ageHours = (Date.now() - lastRunAtMs) / (1000 * 60 * 60)

    if (ageHours > STALE_THRESHOLD_HOURS) {
      return 'stale-degraded'
    }

    // Economics no listo / upstream no materializado (TASK-1200): el anomaly step
    // corrió pero no evaluó snapshots. NO es empty-positive (no es "salud, sin
    // anomalías") — es pending honesto, no afirmar margen falso como insight.
    if (snapshotsEvaluated === 0) {
      return 'empty-pending'
    }

    if (eligibleCount === 0) {
      return 'empty-positive'
    }

    return 'stale-degraded'
  } catch (error) {
    captureWithDomain(error, 'finance', {
      tags: { source: 'finance_nexa_data_status', stage: 'pg_read' }
    })

    return 'empty-pending'
  }
}
