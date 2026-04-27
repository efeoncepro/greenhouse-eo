import 'server-only'

import { readAgencyAiLlmSummary, readTopAiLlmEnrichments } from '@/lib/ico-engine/ai/llm-enrichment-reader'

import type { HomeAiInsightCard, HomeAiInsightsBentoData } from '../contract'
import type { HomeLoaderContext } from '../registry'

const HOME_PERIOD_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Santiago',
  year: 'numeric',
  month: '2-digit'
})

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

export const loadHomeAiInsightsBento = async (_ctx: HomeLoaderContext): Promise<HomeAiInsightsBentoData> => {
  const parts = HOME_PERIOD_FORMATTER.formatToParts(new Date())
  const year = Number(parts.find(part => part.type === 'year')?.value ?? new Date().getFullYear())
  const month = Number(parts.find(part => part.type === 'month')?.value ?? new Date().getMonth() + 1)

  const [topInsights, summary] = await Promise.all([
    readTopAiLlmEnrichments(year, month, HOME_INSIGHTS_LIMIT).catch(() => []),
    readAgencyAiLlmSummary(year, month, 1).catch(() => ({
      totals: { total: 0, succeeded: 0, failed: 0, avgQualityScore: null },
      latestRun: null,
      recentEnrichments: [],
      timeline: [],
      lastProcessedAt: null
    }))
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
    drillHref: `/agency/insights/${row.enrichmentId}`,
    processedAt: row.processedAt
  }))

  return {
    cards,
    totalAnalyzed: summary.totals.succeeded,
    lastAnalysisAt: summary.lastProcessedAt
  }
}
