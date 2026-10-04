import { Buffer } from 'node:buffer'

import { describe, expect, it } from 'vitest'

import { AI_VISIBILITY_REPORT_PDF_COPY } from '@/lib/copy/ai-visibility-report-pdf'

import { SAMPLE_PUBLIC_REPORT } from '../fixtures'
import { modelFromPublicReport } from '../model'
import {
  formatAiVisibilityReportPdfDate,
  formatAiVisibilityReportPdfPercent,
  resolveAiVisibilityReportPdfLocale,
  resolveAiVisibilityReportPdfPresentation,
  type AiVisibilityReportPdfPresentationContext
} from '../pdf/report-pdf-presentation'

const header = { organizationName: 'Globe', reportDate: '19 may 2026', periodLabel: '4 – 19 de mayo de 2026' }
const model = () => modelFromPublicReport(structuredClone(SAMPLE_PUBLIC_REPORT), 'attachment')

describe('AI Visibility PDF presentation', () => {
  it.each(['es', 'en', 'pt-BR'])('keeps internal methodology identifiers out of public labels in %s', locale => {
    const source = model()
    const context = { locale, audience: 'prospect' as const, audienceSource: 'public_intake' as const }

    source.provenance.scoreVersion = 'ai_visibility_score_v2'
    source.provenance.promptPackVersion = '2.3.0'
    const presentation = resolveAiVisibilityReportPdfPresentation({ model: source, header, context })

    expect(presentation.provenance.scoreVersionLabel).toBe('2')
    expect(presentation.provenance.promptPackVersionLabel).toBe('2.3.0')
    expect(source.provenance.scoreVersion).toBe('ai_visibility_score_v2')

    source.provenance.scoreVersion = 'private_experimental_model_42'
    source.provenance.promptPackVersion = 'internal_pack_customer_42'
    const unknown = resolveAiVisibilityReportPdfPresentation({ model: source, header, context })

    expect(unknown.provenance.scoreVersionLabel).toBe(unknown.copy.noData)
    expect(unknown.provenance.promptPackVersionLabel).toBe(unknown.copy.noData)
  })

  it('preserves every numeric report value and leaves the model untouched', () => {
    const source = model()
    const before = structuredClone(source)
    const presentation = resolveAiVisibilityReportPdfPresentation({ model: source, header })

    expect(source).toEqual(before)
    expect(presentation.overall.score).toBe(source.overallScore)
    expect(presentation.overall.severity).toBe(source.overallSeverity)
    expect(presentation.dimensions.map(row => row.score)).toEqual(source.dimensions.map(row => row.score))
    expect(presentation.levels.map(row => row.score)).toEqual(source.levels.map(row => row.score))
    expect(presentation.priorityPlan.map(row => [row.gapKey, row.dimensionKey, row.severity])).toEqual(
      source.recommendations.map(row => [row.gapKey, row.dimensionKey, row.severity])
    )
    expect(presentation.benchmark.rows.map(row => row.sharePct)).toEqual(source.viewFacts.competitiveBenchmark.rows.map(row => row.sharePct))
    expect(presentation.disclaimer).toBe(source.disclaimer)
  })

  it('uses the existing benchmark percentages, rather than the largest row as denominator', () => {
    const source = model()
    const presentation = resolveAiVisibilityReportPdfPresentation({ model: source, header })
    const leader = presentation.benchmark.rows.find(row => row.mentions === 48)

    expect(leader?.sharePct).toBe(33.3)
    expect(leader?.percentLabel).toBe('33 %')
    expect(presentation.benchmark.totalMentions).toBe(144)
  })

  it('keeps mixed sentiment in the same population as positive, neutral and negative', () => {
    const source = model()

    source.sentimentSummary = { positive: 20, neutral: 20, negative: 20, mixed: 40, evaluated: 100, net: 'mixto' }

    const sentiment = resolveAiVisibilityReportPdfPresentation({ model: source, header }).quality.sentiment

    expect(sentiment.total).toBe(100)
    expect(sentiment.segments.map(segment => segment.percent)).toEqual([20, 20, 20, 40])
    expect(sentiment.segments.reduce((sum, segment) => sum + (segment.percent ?? 0), 0)).toBe(100)

    source.sentimentSummary = { positive: 0, neutral: 0, negative: 0, mixed: 0, evaluated: 0, net: 'sin_dato' }

    expect(resolveAiVisibilityReportPdfPresentation({ model: source, header }).quality.sentiment.segments.every(segment => segment.percent === null)).toBe(true)
  })

  it('distinguishes a measured zero from no response and a level without evidence', () => {
    const source = model()

    source.viewFacts.engineCoverage.providers[0] = {
      ...source.viewFacts.engineCoverage.providers[0], resolved: 24, present: 0, mentionRate: 0, status: 'measured_without_mentions'
    }
    source.viewFacts.engineCoverage.providers[1] = {
      ...source.viewFacts.engineCoverage.providers[1], resolved: 0, present: 0, mentionRate: null, status: 'no_response'
    }

    const result = resolveAiVisibilityReportPdfPresentation({ model: source, header })

    expect(result.engines[0].percentLabel).toBe('0 %')
    expect(result.engines[0].severity).toBe('critico')
    expect(result.engines[1].percentLabel).toBe('—')
    expect(result.engines[1].fractionLabel).toBe('Sin respuesta')
    expect(result.levels.find(level => level.id === 'correct')?.statusLabel).toBe('Sin dato')
    expect(result.levels.find(level => level.id === 'actionable')?.statusLabel).toBe('En cobertura')
  })

  it.each([
    [0, 'critico'], [39, 'critico'], [40, 'atencion'], [69, 'atencion'], [70, 'optimo'], [100, 'optimo'], [null, 'sin_dato']
  ] as const)('labels score %s with the producer severity rule without changing the score', (score, severity) => {
    const source = model()

    source.levels[0] = { ...source.levels[0], score }
    source.dimensions[0] = { ...source.dimensions[0], score }

    const result = resolveAiVisibilityReportPdfPresentation({ model: source, header })

    expect(result.levels[0].severity).toBe(severity)
    expect(result.dimensions[0].severity).toBe(severity)
    expect(result.levels[0].score).toBe(score)
    expect(result.dimensions[0].score).toBe(score)
  })

  it('does not fabricate response coverage for a legacy snapshot', () => {
    const source = model()

    delete source.provenance.providersResponded

    const result = resolveAiVisibilityReportPdfPresentation({ model: source, header })

    expect(result.coverage.respondedCount).toBeNull()
    expect(result.coverage.basisLabel).toContain('cobertura de respuestas no verificada')
  })

  it('respects attachment disclosure and never calls hidden history a first measurement', () => {
    const source = model()

    expect(source.trend.status).toBe('con_tendencia')

    const result = resolveAiVisibilityReportPdfPresentation({ model: source, header })

    expect(result.trend).toBeNull()
    expect(result.trendState).toEqual({ status: 'hidden', label: null })

    source.trend = { status: 'sin_historico', reason: '', previousAsOf: null, overall: null, dimensions: [] }

    expect(resolveAiVisibilityReportPdfPresentation({ model: source, header }).trendState.label).toBe('Primera medición: tu punto de partida')
  })

  it('defaults absent presentation context to prospect without inferring commercial status from the DTO', () => {
    const source = model()

    source.audience = 'client'

    const result = resolveAiVisibilityReportPdfPresentation({ model: source, header })

    expect(result.audience).toBe('prospect')
    expect(result.closing.owner).toBeNull()
    expect(result.closing.ctaUrl).toBe('https://efeoncepro.com/contacto/?utm_source=ai-visibility-grader&utm_medium=pdf&utm_campaign=grader-report&utm_content=contraportada')
  })

  it('renders verified client context without commercial CTA/social or a fabricated next report', () => {
    const result = resolveAiVisibilityReportPdfPresentation({
      model: model(), header,
      context: { audience: 'client', audienceSource: 'organization_commercial_facts' }
    })

    expect(result.closing.ctaUrl).toBeNull()
    expect(result.closing.ctaLabel).toBeNull()
    expect(result.closing.showSocial).toBe(false)
    expect(result.closing.owner?.email).toBe('jreyes@efeoncepro.com')
    expect(result.clientLogo).toBeNull()
    expect(result.closing.nextReportDateLabel).toBeNull()
    expect(result.closing.nextReportLabel).toBeNull()
  })

  it('rejects malformed commercial evidence and unauthorized logo URLs', () => {
    const badAudience = { audience: 'client', audienceSource: 'public_intake' } as unknown as AiVisibilityReportPdfPresentationContext

    const badLogo = {
      audience: 'client', audienceSource: 'organization_commercial_facts',
      clientLogo: { data: 'https://example.com/private-token', format: 'png', alt: 'Client logo' }
    } as unknown as AiVisibilityReportPdfPresentationContext

    expect(() => resolveAiVisibilityReportPdfPresentation({ model: model(), header, context: badAudience })).toThrow('ai_visibility_pdf_invalid_audience_context')
    expect(() => resolveAiVisibilityReportPdfPresentation({ model: model(), header, context: badLogo })).toThrow('ai_visibility_pdf_invalid_logo_context')
    expect(() => resolveAiVisibilityReportPdfPresentation({
      model: model(), header,
      context: { audience: 'client', audienceSource: 'organization_commercial_facts', nextReportDate: 'not a date' }
    })).toThrow('ai_visibility_pdf_invalid_next_report_date')
  })

  it.each(['es', 'en', 'pt-BR'] as const)('localizes the approved dictionary and preserves counterpart names for %s', locale => {
    const source = model()

    const result = resolveAiVisibilityReportPdfPresentation({
      model: source, header,
      context: { audience: 'client', audienceSource: 'organization_commercial_facts', locale, nextReportDate: '2026-06-19', clientLogo: { data: Buffer.from('image fixture'), format: 'png', alt: 'Globe' } }
    })

    expect(result.locale).toBe(locale)
    expect(result.copy).toBe(AI_VISIBILITY_REPORT_PDF_COPY[locale])
    expect(result.copy.closing.prospectEvidence).toContain(result.copy.closing.evidenceFocus!)
    expect(result.copy.closing.clientEvidence).not.toContain(result.copy.closing.evidenceFocus!)
    expect(result.dimensions[0].label).toBe(result.copy.dimension.ai_visibility)
    expect(result.priorityPlan[0].title).toBe(result.copy.recommendation.weak_citation_quality.title)
    expect(result.benchmark.rows.find(row => !row.isBrand)?.name).toBe('Competidor A')
    expect(result.closing.nextReportDateLabel).toBeTruthy()
    expect(result.clientLogo?.data.toString()).toBe('image fixture')
    expect(locale === 'en' ? result.levels[0].label : result.levels[0].label.split(' · ')[1]).toBe('Be Found')
  })

  it('normalizes supported regional locales and falls back to Spanish', () => {
    expect(resolveAiVisibilityReportPdfLocale('en-GB')).toBe('en')
    expect(resolveAiVisibilityReportPdfLocale('PT_br')).toBe('pt-BR')
    expect(resolveAiVisibilityReportPdfLocale('es-MX')).toBe('es')
    expect(resolveAiVisibilityReportPdfLocale('pt-PT')).toBe('es')
    expect(resolveAiVisibilityReportPdfLocale('fr')).toBe('es')
    expect(formatAiVisibilityReportPdfPercent(32, 'en')).toBe('32%')
    expect(formatAiVisibilityReportPdfPercent(32, 'pt-BR')).toBe('32%')
    expect(formatAiVisibilityReportPdfDate('2026-05-19', 'en')).toBe('May 19, 2026')
    expect(formatAiVisibilityReportPdfDate('invalid', 'es')).toBeNull()
    expect(formatAiVisibilityReportPdfDate('2026-02-31', 'en')).toBeNull()
  })

  it('localizes only recognized frozen templates and preserves unknown editorial wording', () => {
    const source = model()
    const context = { audience: 'prospect', audienceSource: 'public_intake', locale: 'en' } as const

    source.citationInsight.ownDomainShare = 80

    const known = resolveAiVisibilityReportPdfPresentation({ model: source, header, context })

    expect(known.overall.verdict).toBe('AI visibility with room for improvement in answer engines')
    expect(known.disclaimer).toBe(AI_VISIBILITY_REPORT_PDF_COPY.en.scopeNotice)
    expect(resolveAiVisibilityReportPdfPresentation({ model: source, header, context: { ...context, locale: 'es' } }).overall.verdict)
      .toBe('Visibilidad en IA con espacio de mejora en answer engines')

    source.headline.frame = 'Editorial wording preserved from a prior report.'
    source.disclaimer = 'Historical scope notice.'
    source.primaryGap = { ...source.primaryGap!, title: 'Custom gap finding.' }
    source.recommendations[0] = { ...source.recommendations[0], action: 'Custom approved action.', title: 'Custom gap title.' }

    const unknown = resolveAiVisibilityReportPdfPresentation({ model: source, header, context })

    expect(unknown.overall.verdict).toBe(source.headline.frame)
    expect(unknown.disclaimer).toBe(source.disclaimer)
    expect(unknown.primaryGap?.finding).toBe('Custom gap finding.')
    expect(unknown.primaryGap?.title).toBe('Custom gap finding.')
    expect(unknown.priorityPlan[0].action).toBe('Custom approved action.')
    expect(unknown.priorityPlan[0].title).toBe('Custom gap title.')
  })
})
