import { aiVisibilityReport, efeonceGraphicLine } from '@efeoncepro/axis-tokens'
import {
  aiVisibilityReportOrbitGeometry,
  resolveAiVisibilityReportIntent,
  type AxisAiVisibilityReportIntent,
  type AxisAiVisibilityReportSeverity
} from '@efeoncepro/axis-ui-contracts'
import { describe, expect, it } from 'vitest'

import { resolveSeverity } from '@/lib/growth/ai-visibility/report/recommendations'

import { SAMPLE_PUBLIC_REPORT } from '../fixtures'
import { modelFromPublicReport } from '../model'
import {
  resolveAiVisibilityReportPdfPresentation,
  type AiVisibilityReportPdfPresentation
} from '../pdf/report-pdf-presentation'
import { ReportPdfBrand, ReportPdfSeverityColors, px } from '../pdf/report-pdf-tokens'

const header = { organizationName: 'Globe', reportDate: '19 may 2026', periodLabel: '4 – 19 de mayo de 2026' }

const severities: Record<AiVisibilityReportPdfPresentation['overall']['severity'], AxisAiVisibilityReportSeverity> = {
  critico: 'critical',
  atencion: 'attention',
  optimo: 'optimal',
  sin_dato: 'no-data'
}

const engines: Record<string, string> = {
  openai: 'chatgpt',
  anthropic: 'claude',
  gemini: 'gemini',
  perplexity: 'perplexity',
  google_ai_overview: 'google-ai-overview'
}

const modelWithoutHistory = (score: number | null = SAMPLE_PUBLIC_REPORT.overallScore) => {
  const model = modelFromPublicReport(structuredClone(SAMPLE_PUBLIC_REPORT), 'attachment')

  model.overallScore = score
  model.overallSeverity = resolveSeverity(score)
  model.trend = { status: 'sin_historico', reason: '', previousAsOf: null, overall: null, dimensions: [] }

  return model
}

/** Contract compatibility probe, not a production resolver or a second presentation source.
 * AXIS 0.1.0 cannot express the attachment's `hidden` trend state. Those snapshots are
 * deliberately excluded from this probe rather than mislabeled as a first measurement.
 * The runtime adapter continues to consume AXIS tokens and the generated editorial extension.
 */
const axisIntentForFirstMeasurement = (p: AiVisibilityReportPdfPresentation): AxisAiVisibilityReportIntent | null => {
  if (p.trendState.status !== 'first_measurement') return null

  return {
    audience: p.audience,
    locale: p.locale,
    organization: { name: p.organizationName },
    period: { label: p.periodLabel, dataAsOfLabel: p.asOfLabel },
    score: {
      value: p.overall.score,
      severity: severities[p.overall.severity],
      severityLabel: p.overall.severityLabel,
      source: p.provenance.scoreVersion
    },
    trend: { status: 'first-measurement' },
    verdict: { lead: p.overall.verdict },
    engines: p.engines.filter(engine => engine.status !== 'not_sampled').map(engine => engines[engine.providerId]),
    assessment: { engines: p.coverage.evaluatedCount, questions: p.coverage.questionCount },
    closing:
      p.audience === 'prospect'
        ? { agendaUrl: p.closing.ctaUrl ?? undefined }
        : { accountLead: p.closing.owner ?? undefined, nextReportLabel: p.closing.nextReportDateLabel ?? undefined }
  }
}

const variants = (['es', 'en', 'pt-BR'] as const).flatMap(locale =>
  (['prospect', 'client'] as const).map(audience => ({ locale, audience }))
)

describe('AI Visibility PDF alignment with the installed AXIS contract', () => {
  it.each(variants)('resolves the real presentation fields for $locale / $audience', ({ locale, audience }) => {
    const p = resolveAiVisibilityReportPdfPresentation({
      model: modelWithoutHistory(),
      header,
      context: { audience, audienceSource: 'organization_commercial_facts', locale }
    })

    const intent = axisIntentForFirstMeasurement(p)

    expect(intent).not.toBeNull()

    const manifest = resolveAiVisibilityReportIntent(intent!)

    expect(manifest.status, manifest.status === 'invalid' ? JSON.stringify(manifest.issues) : undefined).toBe(
      'resolved'
    )
    if (manifest.status !== 'resolved') throw new Error(JSON.stringify(manifest.issues))

    expect(manifest.locale).toEqual({ requested: locale, resolved: locale, fallback: false })
    expect(manifest.audience).toBe(p.audience)
    expect(manifest.pages.map(page => page.kind)).toEqual([...aiVisibilityReport.order])
    expect(manifest.page).toEqual(aiVisibilityReport.page)
    expect(p.dimensions[0].weightLabel.includes(' %')).toBe(manifest.formatting.percentSpace)
    expect(p.levels[0].label.includes(' · ')).toBe(manifest.formatting.levelNames === 'local-and-framework')

    const cover = manifest.pages[0]
    const back = manifest.pages[5]

    expect(cover.kind).toBe('cover')
    expect(back.kind).toBe('back-cover')
    if (cover.kind !== 'cover' || back.kind !== 'back-cover') throw new Error('AXIS page anatomy changed')

    expect(cover.orbit.figure).toBe(p.overall.scoreLabel)
    expect(cover.assessment.engines).toBe(p.coverage.evaluatedCount)
    expect(cover.assessment.questions).toBe(p.coverage.questionCount)
    expect(cover.identity.mode).toBe(audience === 'client' ? 'prepared-for' : 'brand-title')
    expect(back.socials).toBe(p.closing.showSocial)

    if (back.action.kind === 'agenda') {
      expect(audience).toBe('prospect')
      expect(back.action.url).toBe(p.closing.ctaUrl)
    } else {
      expect(audience).toBe('client')
      expect(back.action.accountLead).toEqual(p.closing.owner)
      expect(back.action.nextReportLabel).toBeNull()
      expect(p.closing.ctaUrl).toBeNull()
    }
  })

  it.each([null, 0, 63, 100] as const)('preserves score %s and its SSOT orbit semantics', score => {
    const p = resolveAiVisibilityReportPdfPresentation({ model: modelWithoutHistory(score), header })
    const manifest = resolveAiVisibilityReportIntent(axisIntentForFirstMeasurement(p)!)

    expect(manifest.status, manifest.status === 'invalid' ? JSON.stringify(manifest.issues) : undefined).toBe(
      'resolved'
    )
    if (manifest.status !== 'resolved' || manifest.pages[0].kind !== 'cover') throw new Error('Invalid score fixture')

    const orbit = manifest.pages[0].orbit
    const geometry = aiVisibilityReportOrbitGeometry(p.overall.score)

    expect(p.overall.score).toBe(score)
    expect(orbit.geometry).toEqual(ReportPdfBrand.cover.orbit)
    expect(orbit.position).toEqual(geometry)
    expect(orbit.showOutOf).toBe(p.overall.unitLabel !== null)
    expect(ReportPdfSeverityColors).toEqual(efeonceGraphicLine.measureSeverity.colors)
    expect(px(ReportPdfBrand.cover.orbit.boxPx)).toBe(
      (ReportPdfBrand.cover.orbit.boxPx * 72) / aiVisibilityReport.page.dpi
    )

    if (score === null) {
      expect(p.overall.scoreLabel).toBe('—')
      expect(p.overall.severity).toBe('sin_dato')
      expect(geometry).toBeNull()
      expect(orbit.render).toBe(efeonceGraphicLine.measureSeverity.noData.render)
      expect(orbit.severity).toEqual({ level: 'no-data', label: p.overall.severityLabel, color: null })
    } else {
      expect(orbit.severity.color).toBe(
        ReportPdfSeverityColors.dark[
          severities[p.overall.severity] as Exclude<AxisAiVisibilityReportSeverity, 'no-data'>
        ]
      )
      expect(geometry!.trail.startDeg).toBeGreaterThanOrEqual(0)
      expect(geometry!.trail.sweepDeg).toBeLessThanOrEqual(ReportPdfBrand.cover.orbit.trail.deg)

      if (score === 0) expect(geometry).toEqual({ sphereDeg: 0, trail: { startDeg: 0, sweepDeg: 0 } })
      if (score === 63) expect(geometry).toEqual({ sphereDeg: 226.8, trail: { startDeg: 176.8, sweepDeg: 50 } })
      if (score === 100) expect(geometry).toEqual({ sphereDeg: 360, trail: { startDeg: 310, sweepDeg: 50 } })
    }
  })

  it('excludes hidden history from the resolver probe instead of fabricating a first measurement', () => {
    const model = modelFromPublicReport(structuredClone(SAMPLE_PUBLIC_REPORT), 'attachment')
    const p = resolveAiVisibilityReportPdfPresentation({ model, header })

    expect(model.trend.status).toBe('con_tendencia')
    expect(p.trendState).toEqual({ status: 'hidden', label: null })
    expect(p.trend).toBeNull()
    expect(axisIntentForFirstMeasurement(p)).toBeNull()
  })
})
