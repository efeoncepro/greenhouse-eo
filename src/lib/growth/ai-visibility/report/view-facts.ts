import { GH_GROWTH_AI_VISIBILITY } from '@/lib/copy/growth'

import {
  GROWTH_AI_VISIBILITY_PROVIDER_IDS,
  isGrowthAiVisibilityProviderId,
  type GrowthAiVisibilityProviderId
} from '../contracts'
import type {
  CitationSourceClassificationTotals,
  ClientGraderReport,
  CompetitiveShareOfVoice,
  GraderReport,
  PublicCompetitiveBenchmarkRow,
  PublicEngineCoverageProvider,
  PublicEngineCoverageSummary,
  PublicGraderReport,
  PublicReportDimension,
  PublicReportReadiness,
  PublicReportViewFacts,
  ReportProvenance
} from './contracts'
import {
  PROVIDER_DISPLAY_ID,
  PUBLIC_ENGINE_ROSTER,
  providerSurface
} from './engine-roster'

const DEFAULT_GRADER_URL = 'https://efeoncepro.com/aeo-2/'
const BRAND_BENCHMARK_LABEL = 'Tu marca'

export interface PublicReportViewFactOptions {
  reportUrl?: string | null
  graderUrl?: string
}

type PublicReportViewFactSource = Pick<
  PublicGraderReport | ClientGraderReport | GraderReport,
  | 'overallScore'
  | 'providerPresence'
  | 'provenance'
  | 'citationInsight'
  | 'citationSourceBreakdown'
  | 'competitiveSov'
  | 'sentimentSummary'
  | 'readiness'
  | 'dimensions'
>

const round0 = (value: number): number => Math.round(value)
const round1 = (value: number): number => Math.round(value * 10) / 10

const providerOrder = (providerId: GrowthAiVisibilityProviderId): number =>
  PUBLIC_ENGINE_ROSTER.indexOf(providerId)

const sampledProviderSet = (provenance: ReportProvenance): Set<GrowthAiVisibilityProviderId> =>
  new Set(provenance.providersSampled.filter(isGrowthAiVisibilityProviderId))

const buildEngineCoverage = (
  report: Pick<PublicReportViewFactSource, 'providerPresence' | 'provenance'>
): PublicReportViewFacts['engineCoverage'] => {
  const byProvider = new Map(
    report.providerPresence
      .filter(entry => isGrowthAiVisibilityProviderId(entry.provider))
      .map(entry => [entry.provider, entry])
  )

  const sampled = sampledProviderSet(report.provenance)

  const providers: PublicEngineCoverageProvider[] = PUBLIC_ENGINE_ROSTER.map(providerId => {
    const presence = byProvider.get(providerId)
    const wasSampled = sampled.has(providerId) || presence !== undefined
    const resolved = presence?.resolved
    const present = presence?.present

    const malformed =
      resolved === undefined ||
      present === undefined ||
      !Number.isFinite(resolved) ||
      !Number.isFinite(present) ||
      resolved < 0 ||
      present < 0 ||
      present > resolved

    if (!wasSampled) {
      return {
        providerId,
        displayId: PROVIDER_DISPLAY_ID[providerId],
        label: GH_GROWTH_AI_VISIBILITY.provider_display_label[providerId],
        surface: providerSurface(providerId),
        resolved: null,
        present: null,
        mentionRate: null,
        status: 'not_sampled'
      }
    }

    if (malformed) {
      return {
        providerId,
        displayId: PROVIDER_DISPLAY_ID[providerId],
        label: GH_GROWTH_AI_VISIBILITY.provider_display_label[providerId],
        surface: providerSurface(providerId),
        resolved: null,
        present: null,
        mentionRate: null,
        status: 'unknown'
      }
    }

    if (resolved === 0) {
      return {
        providerId,
        displayId: PROVIDER_DISPLAY_ID[providerId],
        label: GH_GROWTH_AI_VISIBILITY.provider_display_label[providerId],
        surface: providerSurface(providerId),
        resolved: 0,
        present: 0,
        mentionRate: null,
        status: 'no_response'
      }
    }

    const mentionRate = round0((present / resolved) * 100)

    return {
      providerId,
      displayId: PROVIDER_DISPLAY_ID[providerId],
      label: GH_GROWTH_AI_VISIBILITY.provider_display_label[providerId],
      surface: providerSurface(providerId),
      resolved,
      present,
      mentionRate,
      status: present > 0 ? 'measured_with_mentions' : 'measured_without_mentions'
    }
  })

  const measured = providers.filter(provider => provider.resolved !== null)
  const resolved = measured.reduce((sum, provider) => sum + (provider.resolved ?? 0), 0)
  const present = measured.reduce((sum, provider) => sum + (provider.present ?? 0), 0)

  const strongest = providers
    .filter(provider => (provider.present ?? 0) > 0)
    .sort((a, b) => {
      if ((b.present ?? 0) !== (a.present ?? 0)) return (b.present ?? 0) - (a.present ?? 0)
      if ((b.mentionRate ?? 0) !== (a.mentionRate ?? 0)) return (b.mentionRate ?? 0) - (a.mentionRate ?? 0)

      return providerOrder(a.providerId) - providerOrder(b.providerId)
    })[0]

  const weakest = providers
    .filter(provider => (provider.resolved ?? 0) > 0)
    .sort((a, b) => {
      if ((a.mentionRate ?? 0) !== (b.mentionRate ?? 0)) return (a.mentionRate ?? 0) - (b.mentionRate ?? 0)
      if ((a.present ?? 0) !== (b.present ?? 0)) return (a.present ?? 0) - (b.present ?? 0)

      return providerOrder(a.providerId) - providerOrder(b.providerId)
    })[0]

  const summary: PublicEngineCoverageSummary = {
    roster: PUBLIC_ENGINE_ROSTER.length,
    sampled: providers.filter(provider => provider.status !== 'not_sampled').length,
    resolved,
    present,
    shareOfModel: resolved > 0 ? round0((present / resolved) * 100) : null,
    strongestDisplayId: strongest?.displayId ?? null,
    weakestMeasuredDisplayId: weakest?.displayId ?? null
  }

  return { providers, summary }
}

const classificationTotalsOrNull = (
  totals: CitationSourceClassificationTotals | undefined
): CitationSourceClassificationTotals | null => totals ?? null

const buildCitationTotals = (
  report: Pick<PublicReportViewFactSource, 'citationInsight' | 'citationSourceBreakdown'>
): PublicReportViewFacts['citationTotals'] => {
  const totals = classificationTotalsOrNull(report.citationSourceBreakdown.classificationTotals)

  return {
    totalCitations: report.citationSourceBreakdown.totalCitations,
    uniqueDomains: report.citationSourceBreakdown.uniqueDomains,
    ownDomainShare: report.citationInsight.ownDomainShare,
    ownDomain: totals?.own_domain ?? null,
    competitor: totals?.competitor ?? null,
    thirdParty: totals?.third_party ?? null,
    ugc: totals?.ugc ?? null
  }
}

const rankedBenchmarkRows = (competitiveSov: CompetitiveShareOfVoice): PublicCompetitiveBenchmarkRow[] => {
  const totalMentions =
    competitiveSov.brandMentions + competitiveSov.competitors.reduce((sum, competitor) => sum + competitor.mentions, 0)

  if (totalMentions === 0) return []

  return [
    { name: BRAND_BENCHMARK_LABEL, mentions: competitiveSov.brandMentions, isBrand: true },
    ...competitiveSov.competitors.map(competitor => ({ ...competitor, isBrand: false }))
  ]
    .sort((a, b) => {
      if (b.mentions !== a.mentions) return b.mentions - a.mentions
      if (a.isBrand !== b.isBrand) return a.isBrand ? -1 : 1

      return a.name.localeCompare(b.name)
    })
    .map((row, index) => ({
      ...row,
      rank: index + 1,
      deltaVsBrand: row.mentions - competitiveSov.brandMentions,
      sharePct: round1((row.mentions / totalMentions) * 100)
    }))
}

const buildCompetitiveBenchmark = (
  competitiveSov: CompetitiveShareOfVoice
): PublicReportViewFacts['competitiveBenchmark'] => {
  const rows = rankedBenchmarkRows(competitiveSov)
  const totalMentions = competitiveSov.brandMentions + competitiveSov.competitors.reduce((sum, row) => sum + row.mentions, 0)
  const brand = rows.find(row => row.isBrand) ?? null
  const leader = rows[0] ?? null
  const aheadOfBrand = brand ? rows.filter(row => !row.isBrand && row.mentions > brand.mentions) : []
  const nearestAhead = aheadOfBrand.sort((a, b) => a.mentions - b.mentions)[0] ?? null

  return {
    totalMentions,
    brandShare: brand?.sharePct ?? null,
    brandRank: brand?.rank ?? null,
    leaderName: leader?.name ?? null,
    leaderMentions: leader?.mentions ?? null,
    leaderGap: leader && brand ? Math.max(0, leader.mentions - brand.mentions) : null,
    nextGap: nearestAhead && brand ? nearestAhead.mentions - brand.mentions : null,
    leaderMultiple: leader && brand && leader.mentions > brand.mentions && brand.mentions > 0
      ? round1(leader.mentions / brand.mentions)
      : null,
    rows
  }
}

const buildReadinessSummary = (
  readiness: PublicReportReadiness | GraderReport['readiness'] | null
): PublicReportViewFacts['readinessSummary'] => {
  const structuralScore = readiness?.structural.overallScore ?? null
  const agenticScore = readiness?.agentic.overallScore ?? null

  return {
    structuralScore,
    agenticScore,
    actionGap: structuralScore === null || agenticScore === null ? null : structuralScore - agenticScore,
    structuralCoverage: readiness?.structural.coverage ?? null,
    agenticCoverage: readiness?.agentic.coverage ?? null
  }
}

const buildDimensionHighlights = (
  dimensions: PublicReportDimension[]
): PublicReportViewFacts['dimensionHighlights'] => ({
  strengths: dimensions
    .filter((dimension): dimension is PublicReportDimension & { score: number } => dimension.score !== null && dimension.severity === 'optimo')
    .sort((a, b) => b.score - a.score)
    .map(dimension => ({ key: dimension.key, label: dimension.label, score: dimension.score })),
  critical: dimensions
    .filter((dimension): dimension is PublicReportDimension & { score: number } => dimension.score !== null && dimension.severity === 'critico')
    .sort((a, b) => a.score - b.score)
    .map(dimension => ({ key: dimension.key, label: dimension.label, score: dimension.score })),
  unmeasured: dimensions
    .filter(dimension => dimension.score === null || dimension.status === 'empty')
    .map(dimension => ({ key: dimension.key, label: dimension.label }))
})

const providerListText = (engineCoverage: PublicReportViewFacts['engineCoverage']): string => {
  const sampled = engineCoverage.providers.filter(provider => provider.status !== 'not_sampled')
  const providers = sampled.length > 0 ? sampled : engineCoverage.providers

  return providers.map(provider => provider.label).join(' · ')
}

const buildShareFacts = (
  report: Pick<PublicReportViewFactSource, 'overallScore' | 'citationInsight'>,
  engineCoverage: PublicReportViewFacts['engineCoverage'],
  options: PublicReportViewFactOptions
): PublicReportViewFacts['shareFacts'] => ({
  reportUrl: options.reportUrl ?? null,
  graderUrl: options.graderUrl ?? DEFAULT_GRADER_URL,
  scoreText: report.overallScore === null ? 'Score en cobertura' : `${report.overallScore}/100`,
  shareOfModelText:
    engineCoverage.summary.shareOfModel === null
      ? 'Share of Model en cobertura'
      : `${engineCoverage.summary.shareOfModel}% Share of Model`,
  citabilityText:
    report.citationInsight.ownDomainShare === null
      ? 'Citabilidad propia en cobertura'
      : `${report.citationInsight.ownDomainShare}% citas propias`,
  providersText: providerListText(engineCoverage)
})

export const buildPublicReportViewFacts = (
  report: PublicReportViewFactSource,
  options: PublicReportViewFactOptions = {}
): PublicReportViewFacts => {
  const engineCoverage = buildEngineCoverage(report)

  return {
    engineCoverage,
    citationTotals: buildCitationTotals(report),
    competitiveBenchmark: buildCompetitiveBenchmark(report.competitiveSov),
    sentimentFacts: {
      evaluated: report.sentimentSummary.evaluated,
      net: report.sentimentSummary.net,
      positive: report.sentimentSummary.positive,
      neutral: report.sentimentSummary.neutral,
      negative: report.sentimentSummary.negative,
      mixed: report.sentimentSummary.mixed
    },
    readinessSummary: buildReadinessSummary(report.readiness),
    dimensionHighlights: buildDimensionHighlights(report.dimensions),
    shareFacts: buildShareFacts(report, engineCoverage, options)
  }
}

export const PUBLIC_REPORT_VIEW_FACT_PROVIDER_IDS = GROWTH_AI_VISIBILITY_PROVIDER_IDS
