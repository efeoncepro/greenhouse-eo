import { describe, expect, it } from 'vitest'

import { buildGraderReport, toPublicGraderReport, PUBLIC_RECOMMENDATIONS_MAX, type ReportRunMeta } from '../report/builder'
import { makeFinding, makeScore } from './report-fixtures'

const RUN: ReportRunMeta = {
  runId: 'run-fixture',
  status: 'succeeded',
  promptPackVersion: 'prompt-pack.v1',
  finishedAt: '2026-06-24T12:00:00.000Z'
}

// Texto sensible que NO debe filtrarse al DTO público (drift claims, dominios de
// citación crudos, razones internas de review). Los nombres de competidores SÍ se
// muestran (arch §7.7: "top competitors").
const SENSITIVE_DRIFT = 'la IA dijo que somos los más baratos del mercado'
const SENSITIVE_CITATION = 'foro-privado-interno.example.com'
const SENSITIVE_CITATION_URL = `https://${SENSITIVE_CITATION}/private/path?token=secret`
const SENSITIVE_REVIEW = 'detalle interno de review que no debe salir'

const buildWithSensitiveEvidence = () => {
  const score = makeScore(
    { ai_visibility: 0, entity_clarity: 10, citation_quality: 15, category_ownership: 20, competitive_sov: 25, message_alignment: 30 },
    { scoreStatus: 'completed', reviewReasons: [SENSITIVE_REVIEW] }
  )

  const findings = [
    makeFinding({
      brandMentioned: 'yes',
      competitorsMentioned: ['Acme'],
      messageDriftClaims: [SENSITIVE_DRIFT],
      citationDomains: [SENSITIVE_CITATION],
      sourceTypes: ['owned']
    })
  ]

  return buildGraderReport({
    score,
    findings,
    run: RUN,
    observations: [
      {
        observationId: 'obs-sensitive',
        runId: 'run-fixture',
        promptId: 'p01',
        provider: 'openai',
        model: 'model',
        status: 'succeeded',
        answerTextHash: null,
        answerExcerpt: null,
        citations: [{ url: SENSITIVE_CITATION_URL, domain: SENSITIVE_CITATION, title: 'Private' }],
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
}

describe('growth/ai-visibility — public report DTO (defensa en 3 capas)', () => {
  it('capa A — el tipo público no tiene campos para evidencia interna', () => {
    const pub = toPublicGraderReport(buildWithSensitiveEvidence())

    // TASK-1252: la presencia por motor (CONTEOS) SÍ es pública (visibilidad por canal del
    // sujeto, headline del lead magnet). Solo conteos provider/resolved/present, sin texto.
    expect('providerPresence' in pub).toBe(true)
    expect(pub.providerPresence.every(p => Object.keys(p).sort().join() === 'present,provider,resolved')).toBe(true)
    // TASK-1237: la NARRATIVA cruda por motor (providerFindings) sigue internal-only.
    expect('providerFindings' in pub).toBe(false)
    expect(pub.dimensions.every(d => !('reason' in d))).toBe(true)
    expect(pub.dimensions.every(d => !('recommendation' in d))).toBe(true)
    expect(pub.recommendations.every(r => !('priority' in r))).toBe(true)
  })

  it('TASK-1237 — los agregados seguros SÍ van al público; sin dominios crudos', () => {
    const pub = toPublicGraderReport(buildWithSensitiveEvidence())
    const serialized = JSON.stringify(pub)

    // Agregados seguros presentes (%/conteos + dominios agregados, sin URL/path/title).
    expect(typeof pub.citationInsight.findingsWithCitations).toBe('number')
    expect(pub.citationSourceBreakdown.domains[0]).toMatchObject({ domain: 'example.com' })
    expect(serialized).not.toContain(SENSITIVE_CITATION)
    expect(pub.sentimentSummary).toHaveProperty('net')
    expect(pub.positionSummary).toHaveProperty('ranked')
    expect(serialized).not.toContain(SENSITIVE_CITATION_URL)
    expect(serialized).not.toContain('/private/path')
    expect(serialized).not.toContain('token=secret')
    expect(serialized).not.toContain('Private')
  })

  it('capa C — leak test: el JSON público NO contiene raw drift/citation/review', () => {
    const serialized = JSON.stringify(toPublicGraderReport(buildWithSensitiveEvidence()))

    expect(serialized).not.toContain(SENSITIVE_DRIFT)
    expect(serialized).not.toContain(SENSITIVE_CITATION_URL)
    expect(serialized).not.toContain('/private/path')
    expect(serialized).not.toContain(SENSITIVE_REVIEW)
  })

  it('muestra lo permitido del §7.7: score, competidores top, source-type summary, disclaimer', () => {
    const pub = toPublicGraderReport(buildWithSensitiveEvidence())
    const serialized = JSON.stringify(pub)

    expect(pub.audience).toBe('public')
    expect(serialized).toContain('Acme') // nombre de competidor SÍ permitido
    expect(pub.sourceTypeSummary.length).toBeGreaterThan(0)
    expect(pub.disclaimer.length).toBeGreaterThan(0)
    expect(pub.competitiveSov.brandMentions).toBe(1)
  })

  it('acota las recomendaciones públicas a un set limitado', () => {
    const pub = toPublicGraderReport(buildWithSensitiveEvidence())

    expect(pub.recommendations.length).toBeLessThanOrEqual(PUBLIC_RECOMMENDATIONS_MAX)
  })

  it('propaga el gate al público (sin precisión falsa)', () => {
    const score = makeScore({}, { scoreStatus: 'insufficient_data', overallScore: null })
    const pub = toPublicGraderReport(buildGraderReport({ score, findings: [], run: RUN }))

    expect(pub.gate.status).toBe('insufficient_data')
    expect(pub.overallScore).toBeNull()
    expect(pub.gate.nextAction.length).toBeGreaterThan(0)
  })
})
