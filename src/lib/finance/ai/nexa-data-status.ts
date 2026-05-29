import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'

import type { NexaInsightsDataStatus } from '@/lib/ico-engine/ai/nexa-data-status'

// ─── TASK-946 — Nexa Insights honest degradation: Finance variant ──────────
//
// Finance no consume el event log append-only BQ de TASK-943 (signals viven
// en `finance_ai_signals` PG y enrichments en `finance_ai_signal_enrichments`
// PG). Esta variant resuelve `dataStatus` desde PG serving:
//
//   - lastCronRun = MAX(started_at) FROM finance_ai_enrichment_runs WHERE period
//   - eligibleSignalCount = COUNT(*) FROM finance_ai_signals WHERE period
//   - insightsCount viene del summary que el caller ya tiene.
//
// Lógica canonical idéntica al helper ICO (mantener cross-domain coherence):
//
//   1. insightsCount > 0                          → ready
//   2. lastCronRun === null                       → empty-pending
//   3. lastCronRun > 24h ago                      → stale-degraded
//   4. eligibleSignalCount === 0                  → empty-positive
//   5. eligibleSignalCount > 0 && insights === 0  → stale-degraded
//   6. fallback                                   → empty-pending

const STALE_THRESHOLD_HOURS = 24

export interface ResolveFinanceNexaInsightsDataStatusInput {
  insightsCount: number
  periodYear: number
  periodMonth: number
}

interface FinanceStatusRow extends Record<string, unknown> {
  last_run_at: string | null
  eligible_count: number | string | null
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
          SELECT MAX(started_at)::text AS last_run_at
          FROM greenhouse_serving.finance_ai_enrichment_runs
          WHERE period_year = $1
            AND period_month = $2
        ),
        eligible AS (
          SELECT COUNT(*) AS eligible_count
          FROM greenhouse_serving.finance_ai_signals
          WHERE period_year = $1
            AND period_month = $2
        )
        SELECT last_run.last_run_at, eligible.eligible_count
        FROM last_run, eligible
      `,
      [periodYear, periodMonth]
    )

    const row = rows[0]
    const lastRunAtIso = row?.last_run_at ?? null
    const eligibleCount = toCount(row?.eligible_count ?? null)

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
