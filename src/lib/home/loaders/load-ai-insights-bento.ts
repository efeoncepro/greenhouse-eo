import 'server-only'

import { getCurrentPeriodSantiago } from '@/lib/home/period'
import { readAgencyAiLlmSummary, readTopAiLlmEnrichments } from '@/lib/ico-engine/ai/llm-enrichment-reader'

import type { HomeAiInsightCard, HomeAiInsightsBentoData } from '../contract'

// TASK-950 — `HOME_PERIOD_FORMATTER` inline removido. Consume helper canonical
// `getCurrentPeriodSantiago()` desde `src/lib/home/period.ts` (single source of
// truth cross-module).

const inferDomain = (signalType: string | null | undefined): HomeAiInsightCard['domain'] => {
  if (!signalType) return 'agency'
  const lowered = signalType.toLowerCase()

  if (lowered.includes('finance') || lowered.includes('margin') || lowered.includes('cobr')) return 'finance'
  if (lowered.includes('delivery') || lowered.includes('ftr') || lowered.includes('otd')) return 'delivery'
  if (lowered.includes('hr') || lowered.includes('payroll') || lowered.includes('asistencia')) return 'hr'
  if (lowered.includes('commercial') || lowered.includes('quote') || lowered.includes('lead')) return 'commercial'
  if (lowered.includes('people') || lowered.includes('capacity')) return 'people'
  if (lowered.includes('integration') || lowered.includes('sync')) return 'integrations'

  return 'agency'
}

const inferSeverity = (severity: string | null | undefined): HomeAiInsightCard['severity'] => {
  if (!severity) return null
  const lowered = severity.toLowerCase()

  if (lowered === 'critical' || lowered === 'high') return 'critical'
  if (lowered === 'warning' || lowered === 'medium') return 'warning'

  return 'info'
}

const HOME_INSIGHTS_LIMIT = 4

export const loadHomeAiInsightsBento = async (): Promise<HomeAiInsightsBentoData> => {
  const { year, month } = getCurrentPeriodSantiago()

  const [topInsights, summary] = await Promise.all([
    readTopAiLlmEnrichments(year, month, HOME_INSIGHTS_LIMIT).catch(() => []),
    readAgencyAiLlmSummary(year, month, 1).catch(
      () =>
        ({
          totals: { total: 0, succeeded: 0, failed: 0, avgQualityScore: null },
          latestRun: null,
          recentEnrichments: [],
          timeline: [],
          lastProcessedAt: null,
          // TASK-946 — honest degradation: si el summary read falla por
          // completo, no podemos afirmar cron status; default canonical
          // conservador = empty-pending (igual contract que helper interno).
          dataStatus: 'empty-pending' as const
        })
    )
  ])

  const cards: HomeAiInsightCard[] = topInsights.map(row => ({
    insightId: row.enrichmentId,
    domain: inferDomain(row.signalType),
    signalType: row.signalType,
    severity: inferSeverity(row.severity),
    metricLabel: row.metricName,
    headline: row.explanationSummary ?? row.metricName,
    rootCauseSummary: row.rootCauseNarrative ?? null,
    recommendedAction: row.recommendedAction ?? null,

    // TASK-947 — drillHref canonical:
    // - Routing top-level `/nexa/insights/[id]` (NO `/agency/insights/*`
    //   legacy roto, TASK-696 drift cerrado).
    // - Drill key = `signalId` (signal-anchored, prefix `EO-AIS-*`), estable
    //   cross-period TASK-943 append-only. NUNCA `enrichmentId` para cards
    //   "Ver causa raíz" del current — `enrichmentId` queda reservado para
    //   share permalinks (TASK-449 V1.3).
    // - El helper canonical `readNexaInsightDrill` (TASK-947) dispatchea
    //   ambos prefijos (`EO-AIS-*` + `EO-AIE-*` + `EO-AIH-*`).
    drillHref: `/nexa/insights/${row.signalId}`,
    processedAt: row.processedAt
  }))

  return {
    cards,
    totalAnalyzed: summary.totals.succeeded,
    lastAnalysisAt: summary.lastProcessedAt,
    // TASK-946 — propagate honest degradation state desde el summary canonical.
    // El Home bento decide su render UI via este flag (4 estados server-side +
    // loading local). Backward-compat: undefined si summary no lo expone.
    dataStatus: summary.dataStatus
  }
}
