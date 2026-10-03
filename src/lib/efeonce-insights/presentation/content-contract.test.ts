import { describe, expect, it } from 'vitest'

import { INSIGHT_MODULES } from '../contracts/request'
import {
  CONTENT_CONTRACT,
  CONTENT_METRIC_RULES,
  INSIGHT_CONTENT_QUESTIONS,
  contentCell,
  contentCoverageOf,
  questionOfMetric
} from './content-contract'

/**
 * TASK-1962 — el contrato de contenido es el gate de mantenimiento del informe. Estas pruebas no comparan textos: exigen
 * que cada métrica que un productor puede emitir tenga pregunta, y que cada veredicto `producer_now` de hechos tenga al
 * menos una métrica que lo sostenga. El otro extremo del gate vive en `adapters/adapters.test.ts`
 * (`expectContentContract`): ahí se ejercitan los adapters reales con sus readers simulados.
 */
describe('contrato de contenido del informe', () => {
  it('declara las ocho preguntas, cada una con veredicto y evidencia por módulo', () => {
    expect(CONTENT_CONTRACT.map(row => row.question)).toEqual([...INSIGHT_CONTENT_QUESTIONS])

    for (const row of CONTENT_CONTRACT) {
      for (const moduleKey of INSIGHT_MODULES) {
        expect(row.byModule[moduleKey].evidence.length, `${row.question}/${moduleKey}`).toBeGreaterThan(10)
      }
    }
  })

  it('ninguna métrica responde a una pregunta que el contrato declara sin productor para ese módulo', () => {
    for (const rule of CONTENT_METRIC_RULES) {
      expect(contentCell(rule.question, rule.module).verdict, `${rule.module}:${rule.prefix} → ${rule.question}`).toBe('producer_now')
    }
  })

  it('toda pregunta de hechos con productor tiene al menos una métrica que la sostiene', () => {
    for (const row of CONTENT_CONTRACT.filter(r => r.answeredBy === 'facts')) {
      for (const moduleKey of INSIGHT_MODULES) {
        if (row.byModule[moduleKey].verdict !== 'producer_now') continue
        expect(CONTENT_METRIC_RULES.some(rule => rule.module === moduleKey && rule.question === row.question), `${row.question}/${moduleKey}`).toBe(true)
      }
    }
  })

  it('clasifica por nombre exacto o espacio de nombres, y deja sin contrato lo desconocido', () => {
    expect(questionOfMetric('seo', 'clicks')).toBe('outcome')
    expect(questionOfMetric('seo', 'clicks_extra')).toBeNull()
    expect(questionOfMetric('seo', 'driver.query.clicks')).toBe('drivers')
    expect(questionOfMetric('aeo', 'sov.competitor.comex')).toBe('competition')
    expect(questionOfMetric('aeo', 'mention_rate.gemini')).toBe('outcome')
    expect(questionOfMetric('ico', 'target.otd')).toBe('measurement')
    expect(questionOfMetric('ico', 'delivered.completed')).toBe('work_delivered')
    expect(questionOfMetric('seo', 'otd')).toBeNull()
  })

  it('la competencia SEO queda bloqueada por política, no como dato faltante', () => {
    expect(contentCell('competition', 'seo').verdict).toBe('policy_blocked')
  })

  it('la cobertura de una edición dice qué responde y por qué no lo demás', () => {
    const coverage = contentCoverageOf({
      modules: ['seo'],
      facts: [{ module: 'seo', metricId: 'clicks', value: 10 }, { module: 'seo', metricId: 'driver.query.clicks', value: null }],
      hasActions: true,
      hasAsk: false,
      hasMeasurement: false,
      hasLimits: true
    })

    const byQuestion = Object.fromEntries(coverage.map(entry => [entry.question, entry]))

    expect(byQuestion.outcome.status).toBe('answered')
    // Un hecho sin valor no responde: la pregunta queda abierta como «sin datos en la ventana».
    expect(byQuestion.drivers).toMatchObject({ status: 'not_answered', gaps: [{ module: 'seo', verdict: 'no_data_in_window' }] })
    expect(byQuestion.competition.gaps[0].verdict).toBe('policy_blocked')
    expect(byQuestion.recommendations.status).toBe('answered')
    expect(byQuestion.asks.status).toBe('not_answered')
    expect(byQuestion.measurement.gaps[0].verdict).toBe('needs_input')
  })
})
