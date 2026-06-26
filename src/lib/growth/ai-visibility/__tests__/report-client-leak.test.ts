import { describe, expect, it } from 'vitest'

import {
  buildGraderReport,
  toClientGraderReport,
  toPublicGraderReport,
  PUBLIC_RECOMMENDATIONS_MAX,
  type ReportRunMeta
} from '../report/builder'
import { makeFinding, makeScore } from './report-fixtures'

/**
 * TASK-1243 — Leak test del DTO CLIENTE (defensa en 3 capas, espejo del público).
 * El cliente autenticado ve un reporte leak-safe (sin evidencia cruda de provider) PERO con el
 * set COMPLETO de recomendaciones (el público acota a 3). Misma garantía estructural que el
 * público; la única diferencia es el cap de recomendaciones.
 */

const RUN: ReportRunMeta = {
  runId: 'run-fixture',
  status: 'succeeded',
  promptPackVersion: 'prompt-pack.v1',
  finishedAt: '2026-06-24T12:00:00.000Z'
}

const SENSITIVE_DRIFT = 'la IA dijo que somos los más baratos del mercado'
const SENSITIVE_CITATION = 'foro-privado-interno.example.com'
const SENSITIVE_REVIEW = 'detalle interno de review que no debe salir'

// Las 6 dimensiones driver en gap → 6 recomendaciones (>3) para probar que el cliente NO se acota.
const buildWithSensitiveEvidence = () => {
  const score = makeScore(
    { ai_visibility: 0, entity_clarity: 5, citation_quality: 10, category_ownership: 12, competitive_sov: 15, message_alignment: 18 },
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

  return buildGraderReport({ score, findings, run: RUN })
}

describe('growth/ai-visibility — client report DTO (defensa en 3 capas)', () => {
  it('capa A — el tipo cliente no tiene campos para evidencia interna', () => {
    const client = toClientGraderReport(buildWithSensitiveEvidence())

    expect('providerPresence' in client).toBe(false)
    expect('providerFindings' in client).toBe(false)
    expect('accuracyFindings' in client).toBe(false)
    expect(client.dimensions.every(d => !('reason' in d))).toBe(true)
    expect(client.dimensions.every(d => !('recommendation' in d))).toBe(true)
    expect(client.recommendations.every(r => !('priority' in r))).toBe(true)
    expect(client.audience).toBe('client')
  })

  it('capa C — leak test: el JSON cliente NO contiene raw drift/citation/review', () => {
    const serialized = JSON.stringify(toClientGraderReport(buildWithSensitiveEvidence()))

    expect(serialized).not.toContain(SENSITIVE_DRIFT)
    expect(serialized).not.toContain(SENSITIVE_CITATION)
    expect(serialized).not.toContain(SENSITIVE_REVIEW)
  })

  it('entre público e interno — el cliente NO acota las recomendaciones (a diferencia del público)', () => {
    const report = buildWithSensitiveEvidence()
    const client = toClientGraderReport(report)
    const pub = toPublicGraderReport(report)

    // Cliente = set completo (igual al interno); público = acotado.
    expect(client.recommendations.length).toBe(report.recommendations.length)
    expect(client.recommendations.length).toBeGreaterThan(PUBLIC_RECOMMENDATIONS_MAX)
    expect(pub.recommendations.length).toBeLessThanOrEqual(PUBLIC_RECOMMENDATIONS_MAX)
  })

  it('muestra lo accionable permitido: score, competidores, disclaimer, recomendaciones', () => {
    const client = toClientGraderReport(buildWithSensitiveEvidence())
    const serialized = JSON.stringify(client)

    expect(serialized).toContain('Acme')
    expect(client.disclaimer.length).toBeGreaterThan(0)
    expect(client.recommendations.every(r => r.action.length > 0)).toBe(true)
    expect(client.competitiveSov.brandMentions).toBe(1)
  })
})
