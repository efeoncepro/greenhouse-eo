import { describe, expect, it } from 'vitest'

import { deriveDiagnosticoFacts, type DiagnosticoSource } from '../diagnostico-facts'
import { ProposalInputError } from '../../errors'
import skySnapshot from './fixtures/grader-report-sky-grun-00046.json'

/**
 * TASK-1415 Slice 2 — el mapper de diagnóstico contra el RUN REAL `EO-GRUN-00046` (SKY).
 *
 * El fixture es un snapshot del `GraderReport` real (generado con `readGraderReport` contra PG,
 * 2026-07-16). El golden de comparación son los valores que un humano autoró A MANO en el
 * deck-plan de SKY: si el mapper no los reproduce, o el mapeo canónico cambió o el mapper está
 * mal — ambos son findings, nunca se ajusta el golden en silencio.
 */

const buildSource = (overrides: Partial<DiagnosticoSource> = {}): DiagnosticoSource => ({
  runPublicId: 'EO-GRUN-00046',
  brandName: 'SKY Airline',
  publicReportUrl:
    'https://think.efeoncepro.com/brand-visibility/r/grt-9892e5684c394557a63f8171926871c26d3278216daf42a2a8100951ccb5537f',
  report: skySnapshot as unknown as DiagnosticoSource['report'],
  ...overrides
})

describe('deriveDiagnosticoFacts (mapper puro, run real EO-GRUN-00046)', () => {
  it('deriva los 5 peldaños del golden SKY: 40/70/37/8/76, en orden ascendente', () => {
    const facts = deriveDiagnosticoFacts(buildSource())

    expect(facts.rungs.map(rung => ({ anchor: rung.anchor, score: rung.numericValue }))).toEqual([
      { anchor: 'Be Found', score: 40 },
      { anchor: 'Be Readable', score: 70 },
      { anchor: 'Be Correct', score: 37 },
      { anchor: 'Be Actionable', score: 8 },
      { anchor: 'Be Intrinsic', score: 76 }
    ])
  })

  it('cada peldaño lleva su evidenceRef al run (sin fecha, como el golden de la escalera)', () => {
    const facts = deriveDiagnosticoFacts(buildSource())

    for (const rung of facts.rungs) {
      expect(rung.evidenceRef).toBe('AI Visibility Grader · run EO-GRUN-00046')
    }
  })

  it('deriva los hechos-titular del golden: citabilidad 0% y SOV 16 vs 9', () => {
    const facts = deriveDiagnosticoFacts(buildSource())
    const citability = facts.goals.find(goal => goal.factId === 'goal.citability')
    const sov = facts.goals.find(goal => goal.factId === 'goal.sov-gap')

    expect(citability?.value).toBe('0%')
    expect(citability?.evidenceRef).toBe('AI Visibility Grader · run EO-GRUN-00046 · 2026-07')
    expect(sov?.value).toBe('16 vs 9')
    expect(sov?.label).toContain('LATAM Airlines')
    expect(sov?.label).toContain('JetSMART')
  })

  it('deriva la munición de contexto del golden: 254 citas, 35 respuestas, 5 motores, fuentes top', () => {
    const facts = deriveDiagnosticoFacts(buildSource())
    const byId = new Map(facts.context.map(fact => [fact.factId, fact.value]))

    expect(byId.get('context.total-citations')).toBe('254')
    expect(byId.get('context.answers-resolved')).toBe('35')
    expect(byId.get('context.engines-sampled')).toBe('5')
    expect(byId.get('context.top-external-sources')).toBe('Trustpilot, Wikipedia e Instagram')
  })

  it('el subject de la escalera se deriva del run (golden: "5 motores · 35 respuestas · julio 2026")', () => {
    const facts = deriveDiagnosticoFacts(buildSource())

    expect(facts.subjectName).toBe('SKY Airline')
    expect(facts.subjectContext).toBe('5 motores · 35 respuestas · julio 2026')
  })

  it('la URL pública del informe entra como hecho (allowlist de links del framing)', () => {
    const facts = deriveDiagnosticoFacts(buildSource())
    const url = facts.context.find(fact => fact.factId === 'context.report-url')

    expect(url?.value).toContain('think.efeoncepro.com')
  })

  it('un hecho externo del operador viaja verbatim con su evidenceRef (nunca lo produce el LLM)', () => {
    const facts = deriveDiagnosticoFacts(
      buildSource({
        operatorFacts: [
          {
            factId: 'goal.organic-traffic',
            label: 'Visitas orgánicas mensuales del blog',
            value: '~40.000',
            evidenceRef: 'Semrush · database CL · 2026-07-11'
          }
        ]
      })
    )

    const traffic = facts.goals.find(goal => goal.factId === 'goal.organic-traffic')

    expect(traffic?.value).toBe('~40.000')
    expect(traffic?.evidenceRef).toBe('Semrush · database CL · 2026-07-11')
  })

  it('un hecho externo SIN evidenceRef RECHAZA (el operador también exige fuente)', () => {
    expect(() =>
      deriveDiagnosticoFacts(
        buildSource({
          operatorFacts: [{ factId: 'x', label: 'X', value: '99', evidenceRef: '   ' }]
        })
      )
    ).toThrow(ProposalInputError)
  })

  it('un peldaño sin dato RECHAZA fail-closed (sin dato ≠ 0)', () => {
    const snapshot = JSON.parse(JSON.stringify(skySnapshot))

    snapshot.readiness = null

    expect(() => deriveDiagnosticoFacts(buildSource({ report: snapshot }))).toThrow(ProposalInputError)
  })

  it('es determinista: mismo source → mismos hechos', () => {
    expect(deriveDiagnosticoFacts(buildSource())).toEqual(deriveDiagnosticoFacts(buildSource()))
  })
})
