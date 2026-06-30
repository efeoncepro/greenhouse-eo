import { describe, expect, it } from 'vitest'

import { buildGraderReport, type ReportRunMeta } from '../report/builder'
import { makeFinding, makeScore } from './report-fixtures'

const RUN: ReportRunMeta = {
  runId: 'run-fixture',
  status: 'succeeded',
  promptPackVersion: 'prompt-pack.v1',
  finishedAt: '2026-06-24T12:00:00.000Z'
}

const build = (findings: ReturnType<typeof makeFinding>[], subjectDomain: string | null = 'efeonce.org') =>
  buildGraderReport({ score: makeScore({ ai_visibility: 10 }), findings, run: RUN, subjectDomain })

describe('growth/ai-visibility — report signal enrichment (TASK-1237)', () => {
  it('citation share propio: % de respuestas con citas que citan el dominio del sujeto', () => {
    const report = build([
      makeFinding({ citationDomains: ['efeonce.org', 'otro.com'] }),
      makeFinding({ citationDomains: ['tercero.cl'] }),
      makeFinding({ citationDomains: [] }) // sin citas → no entra al denominador
    ])

    expect(report.citationInsight.findingsWithCitations).toBe(2)
    expect(report.citationInsight.findingsCitingOwnDomain).toBe(1)
    expect(report.citationInsight.ownDomainShare).toBe(50)
  })

  it('citation share null (sin dato) si no hay respuestas con citas — NUNCA 0', () => {
    const report = build([makeFinding({ citationDomains: [] }), makeFinding({ citationDomains: [] })])

    expect(report.citationInsight.findingsWithCitations).toBe(0)
    expect(report.citationInsight.ownDomainShare).toBeNull()
  })

  it('sin subjectDomain → citation share 0 citando propio (no crashea)', () => {
    const report = build([makeFinding({ citationDomains: ['otro.com'] })], null)

    expect(report.citationInsight.findingsCitingOwnDomain).toBe(0)
    expect(report.citationInsight.ownDomainShare).toBe(0)
  })

  it('sentiment summary: conteos por etiqueta + saldo nombrado (excluye unknown)', () => {
    const report = build([
      makeFinding({ sentimentLabel: 'positive' }),
      makeFinding({ sentimentLabel: 'positive' }),
      makeFinding({ sentimentLabel: 'negative' }),
      makeFinding({ sentimentLabel: 'unknown' })
    ])

    expect(report.sentimentSummary).toMatchObject({ positive: 2, negative: 1, evaluated: 3, net: 'positivo' })
  })

  it('sentiment sin evaluación → net sin_dato; empate → mixto', () => {
    expect(build([makeFinding({ sentimentLabel: 'unknown' })]).sentimentSummary.net).toBe('sin_dato')
    expect(
      build([makeFinding({ sentimentLabel: 'positive' }), makeFinding({ sentimentLabel: 'negative' })]).sentimentSummary.net
    ).toBe('mixto')
  })

  it('position summary: mejor (min) + promedio del brandRank; null honesto sin rank', () => {
    const ranked = build([
      makeFinding({ brandRank: 3 }),
      makeFinding({ brandRank: 1 }),
      makeFinding({ brandRank: null })
    ])

    expect(ranked.positionSummary).toEqual({ best: 1, average: 2, ranked: 2 })

    const unranked = build([makeFinding({ brandRank: null })])

    expect(unranked.positionSummary).toEqual({ best: null, average: null, ranked: 0 })
  })

  it('findings por motor: presente / invisible, solo motores con respuestas evaluables', () => {
    const report = build([
      makeFinding({ provider: 'openai', brandMentioned: 'yes' }),
      makeFinding({ provider: 'gemini', brandMentioned: 'no' }),
      makeFinding({ provider: 'perplexity', brandMentioned: 'unknown' }) // resolved 0 → no aparece
    ])

    const keys = report.providerFindings.map(f => f.key)

    expect(keys).toContain('provider:openai')
    expect(keys).toContain('provider:gemini')
    expect(keys).not.toContain('provider:perplexity')

    const gemini = report.providerFindings.find(f => f.key === 'provider:gemini')!

    expect(gemini.text).toContain('Invisible')
    expect(gemini.severity).toBe('critico')
    const openai = report.providerFindings.find(f => f.key === 'provider:openai')!

    expect(openai.text).toContain('Presente')
  })

  it('es determinista: mismo input → mismo enriquecimiento', () => {
    const findings = [makeFinding({ provider: 'openai', brandMentioned: 'yes', citationDomains: ['efeonce.org'], sentimentLabel: 'positive', brandRank: 2 })]

    expect(build(findings)).toEqual(build(findings))
  })
})
