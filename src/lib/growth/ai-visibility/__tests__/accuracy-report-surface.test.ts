import { describe, expect, it } from 'vitest'

import { buildBrandTruth } from '../accuracy'
import { buildGraderReport, toPublicGraderReport, type ReportRunMeta } from '../report/builder'
import { makeFinding, makeScore } from './report-fixtures'

const RUN: ReportRunMeta = {
  runId: 'run-fixture',
  status: 'succeeded',
  promptPackVersion: 'prompt-pack.v1',
  finishedAt: '2026-06-24T12:00:00.000Z'
}

const TRUTH = buildBrandTruth({ brandName: 'Efeonce', category: 'agencia de marketing', competitorsDeclared: [] })

const build = (findings: ReturnType<typeof makeFinding>[]) =>
  buildGraderReport({ score: makeScore({ ai_visibility: 10 }), findings, run: RUN, brandTruth: TRUTH })

describe('growth/ai-visibility — report accuracy surface (TASK-1238)', () => {
  it('surfacea hallazgos de exactitud con etiqueta es-CL (internal)', () => {
    const report = build([
      makeFinding({ brandMentioned: 'ambiguous' }),
      makeFinding({ brandMentioned: 'yes', categoryAssociations: ['fintech'] })
    ])

    const kinds = report.accuracyFindings.map(f => f.kind)

    expect(kinds).toContain('entity_collision')
    expect(kinds).toContain('category_mismatch')
    expect(report.accuracyFindings.find(f => f.kind === 'entity_collision')?.label).toBe('Confusión de identidad')
  })

  it('sin brandTruth → sin hallazgos (degradación honesta)', () => {
    const report = buildGraderReport({
      score: makeScore({ ai_visibility: 10 }),
      findings: [makeFinding({ brandMentioned: 'ambiguous' })],
      run: RUN
    })

    expect(report.accuracyFindings).toEqual([])
  })

  it('accuracyFindings es INTERNAL-only: NUNCA viaja al DTO público', () => {
    const report = build([makeFinding({ brandMentioned: 'ambiguous' }), makeFinding({ brandMentioned: 'ambiguous' })])
    const pub = toPublicGraderReport(report)

    expect(report.accuracyFindings.length).toBeGreaterThan(0)
    expect('accuracyFindings' in pub).toBe(false)
    // el detalle interno tampoco aparece serializado en el público
    expect(JSON.stringify(pub)).not.toContain('Confusión de identidad')
  })
})
