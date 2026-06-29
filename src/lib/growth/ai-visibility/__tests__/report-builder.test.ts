import { describe, expect, it } from 'vitest'

import { GH_GROWTH_AI_VISIBILITY } from '@/lib/copy/growth'

import { buildGraderReport, type ReportRunMeta } from '../report/builder'
import { makeFinding, makeScore } from './report-fixtures'

const RUN: ReportRunMeta = {
  runId: 'run-fixture',
  status: 'succeeded',
  promptPackVersion: 'prompt-pack.v1',
  finishedAt: '2026-06-24T12:00:00.000Z'
}

describe('growth/ai-visibility — report builder', () => {
  it('es determinista: mismo input → mismo reporte', () => {
    const score = makeScore({ ai_visibility: 0, entity_clarity: 20 })
    const findings = [makeFinding({ brandMentioned: 'yes' }), makeFinding({ competitorsMentioned: ['Acme'] })]

    const a = buildGraderReport({ score, findings, run: RUN })
    const b = buildGraderReport({ score, findings, run: RUN })

    expect(a).toEqual(b)
    expect(a.reportVersion).toBe('ai_visibility_report_v1')
    expect(a.recommendationPackVersion).toBe('ai_visibility_recommendation_pack_v1')
  })

  it('null ≠ 0: dimensión sin evidencia es empty/sin_dato (excluida), 0 es gap crítico medido', () => {
    const score = makeScore({ ai_visibility: 0, citation_quality: null })
    const report = buildGraderReport({ score, findings: [], run: RUN })

    const aiVisibility = report.dimensions.find(d => d.key === 'ai_visibility')!
    const citation = report.dimensions.find(d => d.key === 'citation_quality')!

    expect(aiVisibility.score).toBe(0)
    expect(aiVisibility.status).toBe('ok')
    expect(aiVisibility.severity).toBe('critico')

    expect(citation.score).toBeNull()
    expect(citation.status).toBe('empty')
    expect(citation.severity).toBe('sin_dato')
    expect(citation.reason).not.toBeNull() // razón renderizable, no un blanco
    expect(citation.recommendation).toBeNull() // sin evidencia → no se fabrica recomendación
  })

  it('headline = mayor brecha ponderada (ai_visibility 0 con peso 25 domina)', () => {
    const score = makeScore({ ai_visibility: 0, entity_clarity: 30 })
    const report = buildGraderReport({ score, findings: [], run: RUN })

    expect(report.headline.dimensionKey).toBe('ai_visibility')
    expect(report.headline.value).toBe('0/100')
    expect(report.headline.severity).toBe('critico')
    expect(report.headline.metric).toBe('AI Visibility')
  })

  it('propaga gates con razón + próxima acción renderizables', () => {
    const insufficient = buildGraderReport({
      score: makeScore({}, { scoreStatus: 'insufficient_data', overallScore: null }),
      findings: [],
      run: RUN
    })

    expect(insufficient.gate.status).toBe('insufficient_data')
    expect(insufficient.gate.reason).toBe(GH_GROWTH_AI_VISIBILITY.gate.insufficient_data.reason)
    expect(insufficient.gate.nextAction).toBe(GH_GROWTH_AI_VISIBILITY.gate.insufficient_data.nextAction)

    const review = buildGraderReport({
      score: makeScore({ ai_visibility: 10 }, { scoreStatus: 'review_required' }),
      findings: [],
      run: RUN
    })

    expect(review.gate.status).toBe('review_required')

    const partial = buildGraderReport({
      score: makeScore({ ai_visibility: 10 }),
      findings: [],
      run: { ...RUN, status: 'partial' }
    })

    expect(partial.gate.status).toBe('partial')

    const ready = buildGraderReport({ score: makeScore({ ai_visibility: 80 }), findings: [], run: RUN })

    expect(ready.gate.status).toBe('ready')
  })

  it('dimensiones viz-ready: label + explainer plain-language + recomendación si hay gap', () => {
    const score = makeScore({ entity_clarity: 10 })
    const report = buildGraderReport({ score, findings: [], run: RUN })

    const entity = report.dimensions.find(d => d.key === 'entity_clarity')!

    expect(entity.explainer).toBe(GH_GROWTH_AI_VISIBILITY.dimension_explainer.entity_clarity)
    expect(entity.max).toBe(100)
    expect(entity.recommendation?.gapKey).toBe('low_entity_clarity')
  })

  it('findings answer-first: headline primero, ≤5, con contexto (nunca número suelto)', () => {
    const score = makeScore({
      ai_visibility: 0,
      entity_clarity: 10,
      category_ownership: 15,
      citation_quality: 20,
      competitive_sov: 25
    })

    const report = buildGraderReport({ score, findings: [], run: RUN })

    expect(report.findings.length).toBeGreaterThanOrEqual(3)
    expect(report.findings.length).toBeLessThanOrEqual(5)
    expect(report.findings[0].key).toBe('headline:ai_visibility')

    // cada finding lleva severidad nombrada + métrica con contexto
    for (const finding of report.findings) {
      expect(finding.text).toMatch(/Crítico|Atención|Óptimo|Sin dato/)
      expect(finding.text).toMatch(/\/100|sin evidencia/)
    }
  })

  it('primaryGap + recommendedMotion alimentan el HubSpot handoff', () => {
    const score = makeScore({ ai_visibility: 0, entity_clarity: 5 })
    const report = buildGraderReport({ score, findings: [], run: RUN })

    expect(report.primaryGap?.dimensionKey).toBe('entity_clarity')
    expect(report.recommendedMotion).toBe('entity_foundation')
  })

  it('citationSourceBreakdown enriquece la recomendación de digital PR con dominios concretos', () => {
    const score = makeScore({ ai_visibility: 40, citation_quality: 10, entity_clarity: 80 })

    const report = buildGraderReport({
      score,
      findings: [],
      run: RUN,
      subjectDomain: 'acme.com',
      observations: [
        {
          observationId: 'obs-1',
          runId: 'run-fixture',
          promptId: 'p01',
          provider: 'perplexity',
          model: 'sonar',
          status: 'succeeded',
          answerTextHash: null,
          answerExcerpt: null,
          citations: [
            { url: 'https://www.g2.com/products/acme', domain: 'www.g2.com' },
            { url: 'https://reddit.com/r/saas/comments/1', domain: 'reddit.com', sourceType: 'social' },
            { url: 'https://acme.com/use-cases', domain: 'acme.com' }
          ],
          usage: {},
          latencyMs: 10,
          providerRequestHash: 'hash',
          rawEvidencePointer: null,
          errorCode: null,
          providerPolicyVersion: 'policy.v1',
          promptPackVersion: 'prompt-pack.v1',
          createdAt: '2026-06-24T12:00:00.000Z'
        }
      ]
    })

    expect(report.citationSourceBreakdown.domains.map(domain => domain.domain)).toEqual(['acme.com', 'g2.com', 'reddit.com'])
    expect(report.citationSourceBreakdown.domains.find(domain => domain.domain === 'reddit.com')?.classification).toBe('ugc')
    expect(report.recommendations.find(rec => rec.gapKey === 'weak_citation_quality')?.action).toContain('g2.com, reddit.com')
  })

  it('competitiveSov como lista comparable; sourceTypeSummary categórico; presencia por motor', () => {
    const findings = [
      makeFinding({ provider: 'openai', brandMentioned: 'yes', competitorsMentioned: ['Acme', 'Globex'], sourceTypes: ['owned', 'news'] }),
      makeFinding({ provider: 'gemini', brandMentioned: 'no', competitorsMentioned: ['Acme'], sourceTypes: ['news'] }),
      makeFinding({ provider: 'perplexity', brandMentioned: 'unknown' })
    ]

    const report = buildGraderReport({ score: makeScore({ ai_visibility: 10 }), findings, run: RUN })

    expect(report.competitiveSov.brandMentions).toBe(1)
    expect(report.competitiveSov.competitors[0]).toEqual({ name: 'Acme', mentions: 2 })
    expect(report.sourceTypeSummary.find(s => s.sourceType === 'news')?.count).toBe(2)

    const openai = report.providerPresence.find(p => p.provider === 'openai')!

    expect(openai).toEqual({ provider: 'openai', resolved: 1, present: 1 })
    const perplexity = report.providerPresence.find(p => p.provider === 'perplexity')!

    expect(perplexity).toEqual({ provider: 'perplexity', resolved: 0, present: 0 })
  })

  it('procedencia refleja lo realmente muestreado + disclaimer del contrato', () => {
    const findings = [makeFinding({ provider: 'openai', promptId: 'p01' }), makeFinding({ provider: 'gemini', promptId: 'p02' })]
    const report = buildGraderReport({ score: makeScore({ ai_visibility: 10 }), findings, run: RUN })

    expect(report.provenance.asOfDate).toBe('2026-06-24T12:00:00.000Z')
    expect(report.provenance.providersSampled).toEqual(['gemini', 'openai'])
    expect(report.provenance.promptCount).toBe(2)
    expect(report.provenance.scoreVersion).toBe('ai_visibility_score_v1')
    expect(report.disclaimer).toBe(GH_GROWTH_AI_VISIBILITY.disclaimer)
  })
})
