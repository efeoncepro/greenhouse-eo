import type { ReportArtifactModel } from '@/components/growth/ai-visibility/report-artifact/model'
import {
  REPORT_VARIANT_AUDIENCE,
  REPORT_VARIANT_TARGET
} from '@/components/growth/ai-visibility/report-artifact/model'
import { buildPublicReportViewFacts } from '@/lib/growth/ai-visibility/report/view-facts'
import type {
  CategoryTaxonomySummary,
  CitationSourceBreakdown,
  CompetitiveShareOfVoice,
  PositionSummary,
  ReportProvenance,
  ReportTrend,
  SentimentSummary,
  SourceTypeCount
} from '@/lib/growth/ai-visibility/report/contracts'
import { GH_GROWTH_SEO_CLIENT } from '@/lib/copy/growth'

import type { SeoReportArtifactInput, SeoReportArtifactPayload } from './contracts'

/**
 * TASK-1310 — third render adapter of the shared ReportArtifactModel.
 *
 * The SEO report does not pretend that rank is an AEO score. The shared model is the envelope and
 * disclosure boundary; the `surface.seo` extension carries the two SEO/AEO lenses that the SEO
 * renderers need. Existing AEO adapters remain byte-compatible and do not read this extension.
 */

const EMPTY_COMPETITIVE_SOV: CompetitiveShareOfVoice = { brandMentions: 0, competitors: [] }
const EMPTY_SOURCE_SUMMARY: SourceTypeCount[] = []

const EMPTY_CITATION_BREAKDOWN: CitationSourceBreakdown = {
  domains: [],
  totalCitations: 0,
  uniqueDomains: 0,
  classificationTotals: { own_domain: 0, competitor: 0, third_party: 0, ugc: 0 },
  reason: 'sin_citas_evaluables'
}

const EMPTY_CATEGORY_SUMMARY: CategoryTaxonomySummary = {
  taxonomyVersion: 'category_taxonomy_v1',
  status: 'unknown',
  categories: [],
  totalSignals: 0,
  unmappedCount: 0,
  ambiguousCount: 0
}

const EMPTY_SENTIMENT: SentimentSummary = {
  positive: 0,
  neutral: 0,
  negative: 0,
  mixed: 0,
  evaluated: 0,
  net: 'sin_dato'
}

const EMPTY_POSITION: PositionSummary = { best: null, average: null, ranked: 0 }

const EMPTY_TREND: ReportTrend = {
  status: 'sin_historico',
  reason: 'El informe SEO usa una serie de posiciones, no una tendencia run-over-run de AEO.',
  previousAsOf: null,
  overall: null,
  dimensions: []
}

const rankSummary = (input: SeoReportArtifactInput): SeoReportArtifactPayload['summary'] => {
  const series = input.rankEvolution?.series ?? []

  const latest = series
    .map(serie => [...serie.points].reverse().find(point => point.position !== null)?.position ?? null)
    .filter((position): position is number => position !== null)

  const positionAverage = latest.length > 0 ? Math.round((latest.reduce((sum, position) => sum + position, 0) / latest.length) * 10) / 10 : null
  const pageOneCount = latest.filter(position => position <= 10).length
  const opportunityCount = input.gap ? input.gap.quadrants.filter(entry => entry.quadrant !== 'dominante').length : null

  return {
    positionAverage,
    keywordCount: series.length,
    pageOneCount,
    opportunityCount
  }
}

const payloadFromInput = (input: SeoReportArtifactInput): SeoReportArtifactPayload => {
  const summary = rankSummary(input)
  const hasRank = input.rankEvolution !== null
  const hasGap = input.gap !== null

  return {
    organizationName: input.organizationName,
    seoTargetId: input.seoTargetId,
    asOfDate: input.asOfDate,
    rankEvolution: input.rankEvolution
      ? { range: input.rankEvolution.range, series: input.rankEvolution.series }
      : null,
    gap: input.gap,
    summary,
    status: hasRank && hasGap ? 'ready' : hasRank || hasGap ? 'partial' : 'insufficient_data'
  }
}

const provenanceFromInput = (input: SeoReportArtifactInput): ReportProvenance => ({
  asOfDate: input.asOfDate,
  promptPackVersion: 'not_applicable',
  scoreVersion: 'seo_measurement_v1',
  providersSampled: ['google_search_console', 'seo_rank_tracking'],
  promptCount: 0
})

export const modelFromSeoReport = (
  input: SeoReportArtifactInput,
  variant: 'clientPortal' | 'attachment' = 'clientPortal'
): ReportArtifactModel => {
  const seo = payloadFromInput(input)
  const provenance = provenanceFromInput(input)

  const neutralCitationInsight = {
    ownDomainShare: null,
    findingsWithCitations: 0,
    findingsCitingOwnDomain: 0
  }

  const viewFacts = buildPublicReportViewFacts({
    overallScore: null,
    providerPresence: [],
    provenance,
    citationInsight: neutralCitationInsight,
    citationSourceBreakdown: EMPTY_CITATION_BREAKDOWN,
    competitiveSov: EMPTY_COMPETITIVE_SOV,
    sentimentSummary: EMPTY_SENTIMENT,
    readiness: null,
    dimensions: []
  })

  const gate =
    seo.status === 'ready'
      ? {
          status: 'ready' as const,
          reason: 'El informe reúne evolución SEO y lectura SEO × AEO.',
          nextAction: 'Revisa el quadrant y la evolución para decidir el siguiente paso.'
        }
      : seo.status === 'partial'
        ? {
            status: 'partial' as const,
            reason: 'Una de las lentes todavía no tiene cobertura completa.',
            nextAction: 'Completa la medición pendiente para cerrar la lectura 360.'
          }
        : {
            status: 'insufficient_data' as const,
            reason: 'Todavía no hay evidencia suficiente para un informe completo.',
            nextAction: 'Conecta las fuentes y espera la primera captura.'
          }

  return {
    variant,
    audience: REPORT_VARIANT_AUDIENCE[variant],
    renderTarget: REPORT_VARIANT_TARGET[variant],
    gate,
    headline: {
      dimensionKey: 'ai_visibility',
      metric: 'SEO',
      value: seo.summary.positionAverage === null ? null : `#${seo.summary.positionAverage}`,
      frame: 'Posición orgánica medida; SEO y AEO se mantienen como lentes separadas.',
      severity: 'sin_dato'
    },
    overallScore: null,
    overallSeverity: 'sin_dato',
    perceptionAxisScore: null,
    agenticAxisScore: null,
    levels: [],
    dimensions: [],
    primaryGap: null,
    recommendations: [],
    recommendedMotion: null,
    competitiveSov: EMPTY_COMPETITIVE_SOV,
    sourceTypeSummary: EMPTY_SOURCE_SUMMARY,
    citationInsight: neutralCitationInsight,
    citationSourceBreakdown: EMPTY_CITATION_BREAKDOWN,
    categoryTaxonomySummary: EMPTY_CATEGORY_SUMMARY,
    sentimentSummary: EMPTY_SENTIMENT,
    positionSummary: EMPTY_POSITION,
    trend: EMPTY_TREND,
    readiness: null,
    provenance,
    disclaimer: GH_GROWTH_SEO_CLIENT.report.coverage,
    engineSnapshot: [],
    viewFacts,
    surface: { kind: 'seo', seo }
  }
}

export type SeoReportArtifactModel = ReportArtifactModel & { surface: { kind: 'seo'; seo: SeoReportArtifactPayload } }
