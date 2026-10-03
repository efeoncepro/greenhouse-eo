/**
 * TASK-1938 — Pure, PDF-local presentation of the frozen public-safe report.
 * No queries, writes, scoring, recommendation selection, or snapshot mutation.
 * Commercial audience is explicit context, independent of the DTO disclosure audience.
 */
import { Buffer } from 'node:buffer'

import { EFEONCE_URL_HTTPS } from '@/config/efeonce-brand'
import {
  AI_VISIBILITY_REPORT_DEFAULT_ACCOUNT_OWNER,
  AI_VISIBILITY_REPORT_PDF_COPY,
  type AiVisibilityReportPdfLocale
} from '@/lib/copy/ai-visibility-report-pdf'
import { GH_GROWTH_AI_VISIBILITY } from '@/lib/copy/growth'
import { resolveSeverity } from '@/lib/growth/ai-visibility/report/recommendations'
import { SCORE_DIMENSION_CONFIG_BY_KEY } from '@/lib/growth/ai-visibility/scoring/config'

import { reportSectionVisible, type ReportArtifactModel } from '../model'
import type { ReportHeader } from '../web/AiVisibilityReportArtifact'

export type AiVisibilityReportPdfAudience = 'prospect' | 'client'

export interface AiVisibilityReportPdfLogo {
  /** Already authorized and normalized upstream. Never a private endpoint or signed URL. */
  data: Buffer
  format: 'png' | 'jpg'
  alt: string
  /** False for the ordinary logo: renderer uses a clear plate instead of recoloring it. */
  onDark?: boolean
}

export interface AiVisibilityReportPdfAccountOwner {
  name: string
  role: string
  email: string
}

/**
 * The caller resolves commercial facts before rendering. Missing context preserves the
 * existing prospect path; malformed context fails closed instead of silently selling to a client.
 * No tenant/asset IDs, raw responses, or recipient PII belong to this context.
 */
export type AiVisibilityReportPdfPresentationContext = {
  locale?: string | null
  asOf?: string | null
  clientLogo?: AiVisibilityReportPdfLogo | null
  accountOwner?: AiVisibilityReportPdfAccountOwner | null
  /** Actual agreed delivery date, not recurringRegradeNextAt (which schedules a run). */
  nextReportDate?: string | null
} & (
  | { audience: 'prospect'; audienceSource: 'public_intake' | 'organization_commercial_facts' }
  | { audience: 'client'; audienceSource: 'organization_commercial_facts' }
)

export const resolveAiVisibilityReportPdfLocale = (locale: string | null | undefined): AiVisibilityReportPdfLocale => {
  const normalized = locale?.trim().toLowerCase().replaceAll('_', '-')

  if (normalized === 'en' || normalized?.startsWith('en-')) return 'en'
  if (normalized === 'pt-br') return 'pt-BR'

  return 'es'
}

/** One formatter for native text labels; raw numeric values are preserved alongside labels. */
export const formatAiVisibilityReportPdfPercent = (value: number | null, locale: AiVisibilityReportPdfLocale): string => {
  if (value === null || !Number.isFinite(value)) return '—'
  const number = new Intl.NumberFormat(AI_VISIBILITY_REPORT_PDF_COPY[locale].intlLocale, { maximumFractionDigits: 0 }).format(value)

  return `${number}${locale === 'es' ? ' ' : ''}%`
}

const parseReportDate = (value: string | null | undefined): Date | null => {
  if (!value || !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value)) return null
  const date = new Date(value)

  if (!Number.isFinite(date.getTime())) return null
  if (value.length === 10 && date.toISOString().slice(0, 10) !== value) return null

  return date
}

export const formatAiVisibilityReportPdfDate = (
  value: string | null | undefined,
  locale: AiVisibilityReportPdfLocale
): string | null => {
  const date = parseReportDate(value)

  return date
    ? new Intl.DateTimeFormat(AI_VISIBILITY_REPORT_PDF_COPY[locale].intlLocale, {
        day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC'
      }).format(date)
    : null
}

const validateContext = (context: AiVisibilityReportPdfPresentationContext | undefined): void => {
  if (context === undefined) return

  if (
    !context ||
    (context.audience !== 'prospect' && context.audience !== 'client') ||
    (context.audienceSource !== 'public_intake' && context.audienceSource !== 'organization_commercial_facts') ||
    (context.audience === 'client' && context.audienceSource !== 'organization_commercial_facts')
  ) {
    throw new Error('ai_visibility_pdf_invalid_audience_context')
  }

  const logo = context.clientLogo

  if (logo && (!Buffer.isBuffer(logo.data) || logo.data.length === 0 || !['png', 'jpg'].includes(logo.format) || !logo.alt?.trim())) {
    throw new Error('ai_visibility_pdf_invalid_logo_context')
  }

  const owner = context.accountOwner

  if (owner && (!owner.name?.trim() || !owner.role?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(owner.email))) {
    throw new Error('ai_visibility_pdf_invalid_account_owner_context')
  }

  if (context.nextReportDate != null && !parseReportDate(context.nextReportDate)) {
    throw new Error('ai_visibility_pdf_invalid_next_report_date')
  }
}

const buildMeetingUrl = (): string => {
  const url = new URL('/contacto/', EFEONCE_URL_HTTPS)

  url.searchParams.set('utm_source', 'ai-visibility-grader')
  url.searchParams.set('utm_medium', 'pdf')
  url.searchParams.set('utm_campaign', 'grader-report')
  url.searchParams.set('utm_content', 'contraportada')

  return url.toString()
}

export const resolveAiVisibilityReportPdfPresentation = (input: {
  model: ReportArtifactModel
  header: ReportHeader
  context?: AiVisibilityReportPdfPresentationContext
}) => {
  const { model, header, context } = input

  validateContext(context)

  const audience = context?.audience ?? 'prospect'
  const locale = resolveAiVisibilityReportPdfLocale(context?.locale ?? model.provenance.market?.locale)
  const copy = AI_VISIBILITY_REPORT_PDF_COPY[locale]

  const number = (value: number | null): string =>
    value === null || !Number.isFinite(value)
      ? '—'
      : new Intl.NumberFormat(copy.intlLocale, { maximumFractionDigits: 1 }).format(value)

  const percent = (value: number | null): string => formatAiVisibilityReportPdfPercent(value, locale)
  const asOfLabel = formatAiVisibilityReportPdfDate(context?.asOf ?? model.provenance.asOfDate, locale) ?? header.reportDate
  const periodLabel = locale === 'es' ? header.periodLabel : copy.format.period(asOfLabel)
  const scoreValue = (score: number | null): string => score === null ? '—' : `${number(score)}/100`

  const recognizedHeadline = (() => {
    if (model.headline.frame === AI_VISIBILITY_REPORT_PDF_COPY.es.finding.visibleWithoutCitations) return { known: true, text: copy.finding.visibleWithoutCitations }
    if (model.headline.frame === AI_VISIBILITY_REPORT_PDF_COPY.es.finding.mentionedWithoutCitations) return { known: true, text: copy.finding.mentionedWithoutCitations }

    for (const key of Object.keys(SCORE_DIMENSION_CONFIG_BY_KEY) as (keyof typeof SCORE_DIMENSION_CONFIG_BY_KEY)[]) {
      const knownLabels = [SCORE_DIMENSION_CONFIG_BY_KEY[key].label, GH_GROWTH_AI_VISIBILITY.dimension_label[key], AI_VISIBILITY_REPORT_PDF_COPY.es.dimension[key]]

      if (knownLabels.some(label => GH_GROWTH_AI_VISIBILITY.headline_frame[model.headline.severity](label) === model.headline.frame)) {
        return { known: true, text: copy.format.headline[model.headline.severity](copy.dimension[key]) }
      }
    }

    return { known: false, text: model.headline.frame }
  })()

  const dimensions = model.dimensions.map(dimension => ({
    ...dimension,
    label: copy.dimension[dimension.key],
    weight: SCORE_DIMENSION_CONFIG_BY_KEY[dimension.key].weight,
    weightLabel: percent(SCORE_DIMENSION_CONFIG_BY_KEY[dimension.key].weight),
    scoreLabel: scoreValue(dimension.score),
    // Canonical producer helper, not the pre-existing 45-point cut in shared buildLevels.
    // This is presentation only; the frozen score and ReportArtifactModel are unchanged.
    severity: resolveSeverity(dimension.score),
    severityLabel: copy.severity[resolveSeverity(dimension.score)]
  }))

  const dimensionsByKey = new Map(dimensions.map(dimension => [dimension.key, dimension]))

  const levels = model.levels.map((level, index) => {
    const levelCopy = copy.level[level.id]
    const severity = resolveSeverity(level.score)
    const axis = level.axis === 'agentic' ? copy.operability : copy.perception

    return {
      ...level,
      severity,
      severityLabel: copy.severity[severity],
      label: locale === 'en' ? levelCopy.label : `${levelCopy.label} · ${levelCopy.english}`,
      question: levelCopy.question,
      ordinal: String(index + 1).padStart(2, '0'),
      axisLabel: copy.format.levelAxis(String(index + 1).padStart(2, '0'), axis),
      scoreLabel: scoreValue(level.score),
      statusLabel: level.score === null ? level.axis === 'agentic' ? copy.coverage : copy.noData : copy.severity[severity]
    }
  })

  const engines = model.viewFacts.engineCoverage.providers.map(engine => {
    const measured = engine.status === 'measured_with_mentions' || engine.status === 'measured_without_mentions'
    const severity = measured ? resolveSeverity(engine.mentionRate) : 'sin_dato' as const

    const statusLabel = engine.status === 'no_response' ? copy.noResponse
      : engine.status === 'not_sampled' ? copy.notSampled
      : engine.status === 'unknown' ? copy.noData : copy.severity[severity]

    return {
      ...engine,
      severity,
      severityLabel: copy.severity[severity],
      statusLabel,
      percentLabel: percent(engine.mentionRate),
      fractionLabel: measured ? copy.format.fraction(number(engine.present), number(engine.resolved)) : statusLabel
    }
  })

  const requestedCount = (model.provenance.providersRequested ?? model.provenance.providersSampled).length
  const respondedCount = model.provenance.providersResponded?.length ?? null
  const evaluatedCount = model.viewFacts.engineCoverage.summary.sampled

  const coverage = {
    requestedCount,
    respondedCount,
    evaluatedCount,
    questionCount: model.provenance.promptCount,
    evaluatedLabel: copy.format.evaluatedIn(number(evaluatedCount)),
    basisLabel: respondedCount === null
      ? copy.format.coverageUnknown(number(model.provenance.promptCount))
      : copy.format.coverageBasis(number(model.provenance.promptCount), number(respondedCount), number(requestedCount))
  }

  const weakestMeasured = engines
    .filter(engine => engine.mentionRate !== null && (engine.resolved ?? 0) > 0)
    .slice()
    .sort((a, b) => (a.mentionRate as number) - (b.mentionRate as number))
    .slice(0, 2)

  const engineTakeaway = weakestMeasured.length
    ? copy.format.weakestEngines(weakestMeasured.map(engine => `${engine.label} (${engine.percentLabel})`).join(' · '))
    : null

  const benchmark = {
    ...model.viewFacts.competitiveBenchmark,
    basisLabel: copy.format.benchmarkBasis(number(model.viewFacts.competitiveBenchmark.totalMentions)),
    rows: model.viewFacts.competitiveBenchmark.rows.map(row => ({
      ...row,
      name: row.isBrand ? copy.brandLabel : row.name,
      percentLabel: percent(row.sharePct),
      mentionsLabel: copy.format.mentions(number(row.mentions))
    }))
  }

  const citationSources = {
    totalCitations: model.citationSourceBreakdown.totalCitations,
    uniqueDomains: model.citationSourceBreakdown.uniqueDomains,
    basisLabel: copy.format.sourcesBasis(number(model.citationSourceBreakdown.totalCitations)),
    rows: model.citationSourceBreakdown.domains.map(source => ({
      ...source,
      classificationLabel: copy.source[source.classification],
      countLabel: number(source.count)
    }))
  }

  const citationShare = model.citationInsight.ownDomainShare

  const citationEvidence = citationShare === null
    ? copy.noData
    : copy.format.citationBasis(number(model.citationInsight.findingsCitingOwnDomain), number(model.citationInsight.findingsWithCitations))

  const leadingSource = citationSources.rows[0]

  const sourceEvidence = leadingSource
    ? copy.format.leadingSource(leadingSource.domain, number(leadingSource.count), number(citationSources.totalCitations), leadingSource.classificationLabel)
    : null

  const citationFinding = citationShare === null ? null : copy.format.citationFinding(percent(citationShare))

  const primaryGap = model.primaryGap ? {
    ...model.primaryGap,
    title: model.primaryGap.title === GH_GROWTH_AI_VISIBILITY.recommendation[model.primaryGap.gapKey].title
      ? copy.recommendation[model.primaryGap.gapKey].title : model.primaryGap.title,
    dimensionLabel: copy.dimension[model.primaryGap.dimensionKey],
    score: dimensionsByKey.get(model.primaryGap.dimensionKey)?.score ?? null,
    scoreLabel: scoreValue(dimensionsByKey.get(model.primaryGap.dimensionKey)?.score ?? null),
    severityLabel: copy.severity[model.primaryGap.severity],
    finding: model.primaryGap.title === GH_GROWTH_AI_VISIBILITY.recommendation[model.primaryGap.gapKey].title
      && model.primaryGap.gapKey === 'weak_citation_quality' && citationShare !== null && citationShare < 40
      ? copy.finding.mentionedWithoutCitations
      : model.primaryGap.title === GH_GROWTH_AI_VISIBILITY.recommendation[model.primaryGap.gapKey].title
        ? copy.recommendation[model.primaryGap.gapKey].title : model.primaryGap.title,
    evidence: model.primaryGap.gapKey === 'weak_citation_quality'
      ? [citationFinding, sourceEvidence].filter((item): item is string => Boolean(item)).join(' ') || copy.noData
      : null
  } : null

  const priorityPlan = model.recommendations.map(recommendation => {
    const dimension = dimensionsByKey.get(recommendation.dimensionKey)
    const recommendationCopy = copy.recommendation[recommendation.gapKey]

    return {
      ...recommendation,
      title: recommendation.title === GH_GROWTH_AI_VISIBILITY.recommendation[recommendation.gapKey].title
        ? recommendationCopy.title : recommendation.title,
      action: recommendation.action === GH_GROWTH_AI_VISIBILITY.recommendation[recommendation.gapKey].action
        ? recommendationCopy.action : recommendation.action,
      severityLabel: copy.severity[recommendation.severity],
      dimensionLabel: copy.dimension[recommendation.dimensionKey],
      score: dimension?.score ?? null,
      weight: SCORE_DIMENSION_CONFIG_BY_KEY[recommendation.dimensionKey].weight,
      basisLabel: copy.format.planDimension(
        copy.dimension[recommendation.dimensionKey], scoreValue(dimension?.score ?? null),
        percent(SCORE_DIMENSION_CONFIG_BY_KEY[recommendation.dimensionKey].weight)
      )
    }
  })

  const sentiment = model.sentimentSummary
  const sentimentTotal = sentiment.positive + sentiment.neutral + sentiment.negative + sentiment.mixed

  const sentimentSegments = [
    { key: 'positive', net: 'positivo', count: sentiment.positive },
    { key: 'neutral', net: 'neutral', count: sentiment.neutral },
    { key: 'negative', net: 'negativo', count: sentiment.negative },
    { key: 'mixed', net: 'mixto', count: sentiment.mixed }
  ] as const

  const quality = {
    citationShare,
    citationShareLabel: percent(citationShare),
    citationBasis: citationEvidence,
    sentiment: {
      ...sentiment,
      total: sentimentTotal,
      label: copy.sentimentLabel[sentiment.net],
      basisLabel: copy.format.sentimentBasis(number(sentiment.evaluated)),
      segments: sentimentSegments.map(segment => ({
        key: segment.key,
        count: segment.count,
        label: copy.sentimentLabel[segment.net],
        percent: sentimentTotal === 0 ? null : (segment.count / sentimentTotal) * 100,
        percentLabel: percent(sentimentTotal === 0 ? null : (segment.count / sentimentTotal) * 100)
      }))
    },
    prominence: {
      ...model.positionSummary,
      bestLabel: model.positionSummary.best === null ? '—' : `#${number(model.positionSummary.best)}`,
      averageLabel: model.positionSummary.average === null ? '—' : `#${number(model.positionSummary.average)}`,
      basisLabel: model.positionSummary.best === null
        ? copy.noData
        : copy.format.prominenceBasis(model.positionSummary.average === null ? '—' : `#${number(model.positionSummary.average)}`)
    }
  }

  const visibilityDimension = dimensionsByKey.get('ai_visibility')
  const citationDimension = dimensionsByKey.get('citation_quality')

  const visibleWithoutCitations = visibilityDimension?.severity === 'optimo' && citationDimension?.severity === 'critico'
    && citationShare !== null && citationShare < 40

  const overall = {
    score: model.overallScore,
    severity: model.overallSeverity,
    scoreLabel: number(model.overallScore),
    unitLabel: model.overallScore === null ? null : copy.outOf100,
    severityLabel: copy.severity[model.overallSeverity],
    verdict: visibleWithoutCitations && recognizedHeadline.known ? copy.finding.visibleWithoutCitations : recognizedHeadline.text
  }

  // The existing attachment policy hides trend even though the safe DTO carries it.
  // Do not label a comparable-but-hidden history as "first measurement". A future
  // policy change must be explicit and regression-tested before exposing the delta.
  const trendAllowed = reportSectionVisible('attachment', 'trend')

  const trend = trendAllowed && model.trend.status === 'con_tendencia' && model.trend.overall
    ? {
        ...model.trend.overall,
        previousAsOf: model.trend.previousAsOf,
        label: model.trend.overall.delta === null || !model.trend.previousAsOf
          ? copy.noComparableHistory
          : copy.format.trend(
              `${model.trend.overall.delta > 0 ? '▲ ' : model.trend.overall.delta < 0 ? '▼ ' : ''}${number(Math.abs(model.trend.overall.delta))}`,
              formatAiVisibilityReportPdfDate(model.trend.previousAsOf, locale) ?? '—'
            )
      }
    : null

  const trendState = {
    status: trend ? 'visible' as const : model.trend.status === 'sin_historico' ? 'first_measurement' as const
      : !trendAllowed ? 'hidden' as const : 'not_comparable' as const,
    label: trend?.label ?? (model.trend.status === 'sin_historico' ? copy.firstMeasurement : null)
  }

  const owner = audience === 'client' ? context?.accountOwner ?? AI_VISIBILITY_REPORT_DEFAULT_ACCOUNT_OWNER : null

  const nextReportDateLabel = audience === 'client'
    ? formatAiVisibilityReportPdfDate(context?.nextReportDate, locale)
    : null

  const closing = {
    question: audience === 'client' ? copy.closing.clientQuestion : copy.closing.prospectQuestion,
    answer: copy.closing.answer,
    evidence: audience === 'client' ? copy.closing.clientEvidence : copy.closing.prospectEvidence,
    showSocial: audience === 'prospect',
    ctaLabel: audience === 'prospect' ? copy.closing.bookMeeting : null,
    ctaUrl: audience === 'prospect' ? buildMeetingUrl() : null,
    owner,
    nextReportDateLabel,
    nextReportLabel: audience === 'client' && nextReportDateLabel ? copy.closing.nextReport : null
  }

  return {
    locale, copy, audience,
    organizationName: header.organizationName,
    periodLabel, asOfLabel,
    clientLogo: audience === 'client' ? context?.clientLogo ?? null : null,
    overall, dimensions, levels, engines, engineTakeaway, coverage,
    primaryGap, priorityPlan, benchmark, citationSources, quality,
    trend, trendState, closing,
    provenance: {
      asOfLabel,
      promptCountLabel: number(model.provenance.promptCount),
      scoreVersion: model.provenance.scoreVersion,
      promptPackVersion: model.provenance.promptPackVersion,
      // Internal provenance remains available to contracts, never as client-facing copy.
      // Unknown identifiers must not become public labels by falling back to the raw value.
      scoreVersionLabel: /^(?:ai_visibility_score_v|v)?(\d+(?:\.\d+)*)$/.exec(model.provenance.scoreVersion)?.[1] ?? copy.noData,
      promptPackVersionLabel: /^v?(\d+(?:\.\d+)*)$/.exec(model.provenance.promptPackVersion)?.[1] ?? copy.noData
    },
    // Only the canonical, exactly recognized scope notice is localized. Unknown
    // historical/custom notices stay verbatim; the renderer never invents claims.
    disclaimer: model.disclaimer === GH_GROWTH_AI_VISIBILITY.disclaimer ? copy.scopeNotice : model.disclaimer
  }
}

export type AiVisibilityReportPdfPresentation = ReturnType<typeof resolveAiVisibilityReportPdfPresentation>
