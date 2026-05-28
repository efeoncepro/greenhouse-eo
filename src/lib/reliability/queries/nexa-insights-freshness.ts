import 'server-only'

import { query } from '@/lib/db'
import { getIcoEngineProjectId, runIcoEngineQuery } from '@/lib/ico-engine/shared'
import { captureWithDomain } from '@/lib/observability/capture'

import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-941 Slice 5 — Nexa Insights freshness detector (stale_with_eligible_signals).
 *
 * Cierra la red de detección del falso-sano ISSUE-082: cuando BQ `ai_signals`
 * tiene señales para el último período pero el serving PG
 * `greenhouse_serving.ico_ai_signal_enrichments` tiene 0 enrichments para ese
 * mismo período → hay señales elegibles pero 0 insights frescos. Ese es
 * exactamente el síntoma del incidente (BQ May 13 señales / PG May 0 enrichments).
 *
 * Cross-store por diseño: la fuente de "señales elegibles" vive en BQ; la fuente
 * de "insights producidos" vive en PG serving. Comparar ambas es la única forma
 * honesta de detectar el gap (un signal PG-only no sabe que BQ tiene señales).
 *
 * Subsystem rollup: `delivery` (ICO es owned por delivery). NO crear subsystem.
 *
 * Severity matrix:
 *   - BQ sin señales (nada elegible)            → ok
 *   - BQ latest período con señales + PG > 0    → ok (insights frescos)
 *   - BQ latest período con señales + PG = 0    → error (eligible signals, 0 insights)
 *
 * Steady state esperado post-fix (Slices 1-4 + backfill): ok. Cualquier error
 * indica que el pipeline volvió a quedar en falso-sano o que el serving quedó
 * stale respecto a las señales elegibles.
 *
 * Patrón fuente: TASK-900 `ico-materializer-skipped-safety.ts` (mismo shape de
 * reader + degradación honesta a `unknown` si la query falla).
 */

export const NEXA_INSIGHTS_FRESHNESS_SIGNAL_ID =
  'nexa.insights.stale_with_eligible_signals'

interface LatestSignalPeriodRow {
  period_year: number | null
  period_month: number | null
  signal_count: number | null
}

const toCount = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0

  if (typeof value === 'string') {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  if (value && typeof value === 'object' && 'value' in value) {
    return toCount((value as { value?: unknown }).value)
  }

  return 0
}

export const getNexaInsightsFreshnessSignal =
  async (): Promise<ReliabilitySignal> => {
    const observedAt = new Date().toISOString()

    try {
      const projectId = getIcoEngineProjectId()

      const latestRows = await runIcoEngineQuery<LatestSignalPeriodRow>(
        `SELECT period_year, period_month, COUNT(*) AS signal_count
         FROM \`${projectId}.ico_engine.ai_signals\`
         GROUP BY period_year, period_month
         ORDER BY period_year DESC, period_month DESC
         LIMIT 1`
      )

      const latest = latestRows[0]
      const latestSignalCount = toCount(latest?.signal_count)
      const latestYear = toCount(latest?.period_year)
      const latestMonth = toCount(latest?.period_month)

      // Sin señales elegibles en BQ → nada que enriquecer → ok.
      if (!latest || latestSignalCount === 0 || latestYear === 0 || latestMonth === 0) {
        return {
          signalId: NEXA_INSIGHTS_FRESHNESS_SIGNAL_ID,
          moduleKey: 'delivery',
          kind: 'drift',
          source: 'getNexaInsightsFreshnessSignal',
          label: 'Nexa Insights freshness',
          severity: 'ok',
          summary: 'Sin señales AI elegibles en BigQuery; nada que enriquecer.',
          observedAt,
          evidence: [{ kind: 'metric', label: 'latest_signal_count', value: '0' }]
        }
      }

      const enrichmentRows = await query<{ enrichment_count: number | string }>(
        `SELECT COUNT(*)::int AS enrichment_count
         FROM greenhouse_serving.ico_ai_signal_enrichments
         WHERE period_year = $1 AND period_month = $2`,
        [latestYear, latestMonth]
      )

      const enrichmentCount = toCount(enrichmentRows[0]?.enrichment_count)
      const periodLabel = `${latestYear}-${String(latestMonth).padStart(2, '0')}`
      const stale = enrichmentCount === 0

      return {
        signalId: NEXA_INSIGHTS_FRESHNESS_SIGNAL_ID,
        moduleKey: 'delivery',
        kind: 'drift',
        source: 'getNexaInsightsFreshnessSignal',
        label: 'Nexa Insights freshness',
        severity: stale ? 'error' : 'ok',
        summary: stale
          ? `Nexa Insights stale: ${latestSignalCount} señales AI elegibles para ${periodLabel} en BigQuery pero 0 insights en el serving PG. Pipeline en falso-sano o serving stale (ISSUE-082).`
          : `Nexa Insights frescos: ${latestSignalCount} señales elegibles → ${enrichmentCount} enrichments para ${periodLabel}.`,
        observedAt,
        evidence: [
          { kind: 'metric', label: 'latest_signal_period', value: periodLabel },
          { kind: 'metric', label: 'latest_signal_count', value: String(latestSignalCount) },
          { kind: 'metric', label: 'serving_enrichment_count', value: String(enrichmentCount) },
          {
            kind: 'sql',
            label: 'BQ',
            value: 'ico_engine.ai_signals GROUP BY period ORDER BY period DESC LIMIT 1'
          },
          {
            kind: 'sql',
            label: 'PG',
            value: 'greenhouse_serving.ico_ai_signal_enrichments WHERE period_year/month = latest'
          },
          {
            kind: 'doc',
            label: 'Incidente',
            value: 'docs/issues/open/ISSUE-082-nexa-insights-false-healthy-destructive-replace-null-timestamps.md'
          }
        ]
      }
    } catch (error) {
      captureWithDomain(error, 'delivery', {
        tags: { source: 'reliability_signal_nexa_insights_freshness' }
      })

      return {
        signalId: NEXA_INSIGHTS_FRESHNESS_SIGNAL_ID,
        moduleKey: 'delivery',
        kind: 'drift',
        source: 'getNexaInsightsFreshnessSignal',
        label: 'Nexa Insights freshness',
        severity: 'unknown',
        summary: 'No fue posible leer el signal Nexa Insights freshness. Revisa los logs.',
        observedAt,
        evidence: [
          {
            kind: 'metric',
            label: 'error',
            value: error instanceof Error ? error.message : String(error)
          }
        ]
      }
    }
  }
