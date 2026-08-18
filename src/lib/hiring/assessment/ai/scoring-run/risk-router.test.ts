import { describe, expect, it } from 'vitest'

import {
  DEFAULT_AI_RUN_RISK_POLICY,
  isBlindQualitySample,
  routeScoredItem,
  type RiskRoutingInput,
} from './risk-router'

// TASK-1734 Slice 2 — Router de riesgo (`hiring_assessment_ai_risk_policy.v1_1`).
// Módulo puro: cada señal, la muestra ciega determinística y el default conservador
// (en duda / policy OFF → mandatory_review) se prueban sin DB ni env.

const LONG_ANSWER = 'Una respuesta suficientemente larga y desarrollada para superar el mínimo de caracteres de la policy.'

const cleanInput = (overrides: Partial<RiskRoutingInput> = {}): RiskRoutingInput => ({
  runId: 'asrun-1',
  responseId: 'arsp-1',
  answerText: LONG_ANSWER,
  answerMalformed: false,
  rubric: { criteria: ['claridad', 'profundidad'] },
  competencyWeight: 20,
  proposal: {
    // 85 queda FUERA de la banda decision-near default (55–70).
    // Escala declarada del contrato: aportes ponderados que SUMAN el score global (43+42=85).
    score: 85,
    rationale: 'Respuesta sólida.',
    perCriterion: [
      { criterion: 'claridad', weight: 50, score: 43 },
      { criterion: 'profundidad', weight: 50, score: 42 },
    ],
  },
  exceptionPolicyEnabled: true,
  ...overrides,
})

/** Busca un responseId que NO caiga en la muestra ciega para el run del fixture. */
const findNonSampledResponseId = (): string => {
  for (let i = 0; i < 1000; i += 1) {
    const candidate = `arsp-clean-${i}`

    if (!isBlindQualitySample('asrun-1', candidate, DEFAULT_AI_RUN_RISK_POLICY.qualitySampleRate)) {
      return candidate
    }
  }

  throw new Error('fixture inalcanzable')
}

const findSampledResponseId = (): string => {
  for (let i = 0; i < 1000; i += 1) {
    const candidate = `arsp-sample-${i}`

    if (isBlindQualitySample('asrun-1', candidate, DEFAULT_AI_RUN_RISK_POLICY.qualitySampleRate)) {
      return candidate
    }
  }

  throw new Error('fixture inalcanzable')
}

describe('routeScoredItem — señales mandatory', () => {
  it('respuesta vacía → mandatory_review con answer_empty', () => {
    const result = routeScoredItem(cleanInput({ answerText: '   ' }))

    expect(result.riskClass).toBe('mandatory_review')
    expect(result.reasons).toContain('answer_empty')
  })

  it('respuesta demasiado corta → mandatory_review con answer_too_short', () => {
    const result = routeScoredItem(cleanInput({ answerText: 'muy corta' }))

    expect(result.riskClass).toBe('mandatory_review')
    expect(result.reasons).toContain('answer_too_short')
  })

  it('respuesta malformada → mandatory_review con answer_malformed', () => {
    const result = routeScoredItem(cleanInput({ answerText: '', answerMalformed: true }))

    expect(result.riskClass).toBe('mandatory_review')
    expect(result.reasons).toContain('answer_malformed')
  })

  it('rubric faltante o vacía → mandatory_review con rubric_missing', () => {
    expect(routeScoredItem(cleanInput({ rubric: null })).reasons).toContain('rubric_missing')
    expect(routeScoredItem(cleanInput({ rubric: {} })).reasons).toContain('rubric_missing')
  })

  it('proposal sin perCriterion → mandatory_review con per_criterion_missing', () => {
    const result = routeScoredItem(
      cleanInput({ proposal: { score: 85, rationale: 'ok', perCriterion: undefined } }),
    )

    expect(result.riskClass).toBe('mandatory_review')
    expect(result.reasons).toContain('per_criterion_missing')
  })

  it('criterios contradictorios con el score global → mandatory_review', () => {
    const result = routeScoredItem(
      cleanInput({
        proposal: {
          score: 90,
          rationale: 'ok',
          // Aportes 20+40 = 60 implicado vs global 90 → delta 30 > 25 (contradicción REAL).
          perCriterion: [
            { criterion: 'claridad', weight: 50, score: 20 },
            { criterion: 'profundidad', weight: 50, score: 40 },
          ],
        },
      }),
    )

    expect(result.riskClass).toBe('mandatory_review')
    expect(result.reasons).toContain('per_criterion_contradictory')
  })

  it('score dentro de la banda decision-near → mandatory_review', () => {
    const result = routeScoredItem(
      cleanInput({
        proposal: {
          score: 60,
          rationale: 'ok',
          perCriterion: [
            { criterion: 'claridad', weight: 50, score: 32 },
            { criterion: 'profundidad', weight: 50, score: 28 },
          ],
        },
      }),
    )

    expect(result.riskClass).toBe('mandatory_review')
    expect(result.reasons).toContain('score_decision_near_band')
  })

  it('competencia de peso alto → mandatory_review con high_weight_competency', () => {
    const result = routeScoredItem(cleanInput({ competencyWeight: 35 }))

    expect(result.riskClass).toBe('mandatory_review')
    expect(result.reasons).toContain('high_weight_competency')
  })

  it('acumula múltiples señales como evidencia (no se queda con la primera)', () => {
    const result = routeScoredItem(
      cleanInput({
        answerText: 'corta',
        rubric: null,
        competencyWeight: 50,
      }),
    )

    expect(result.riskClass).toBe('mandatory_review')
    expect(result.reasons).toEqual(
      expect.arrayContaining(['answer_too_short', 'rubric_missing', 'high_weight_competency']),
    )
  })
})

// ── Regresión del delta 2026-08-17: la señal se medía contra el PROMEDIO de los criterios,
// pero la escala real son APORTES que suman el score global. Efecto perverso: disparaba en el
// caso sano (11 de 14 items del primer run real) y mandaba a revisión justo las respuestas
// buenas, dejando `batch_eligible` prácticamente muerto.
describe('routeScoredItem — per_criterion_contradictory en la escala declarada', () => {
  it('caso REAL sano: aportes que suman el global NO disparan la señal', () => {
    // Item real del primer run: global 91 = 18+25+25+23 sobre criterios de 25 puntos.
    const result = routeScoredItem(
      cleanInput({
        responseId: findNonSampledResponseId(),
        proposal: {
          score: 91,
          rationale: 'Comunicación completa.',
          perCriterion: [
            { criterion: 'estado real', weight: 25, score: 18 },
            { criterion: 'plan', weight: 25, score: 25 },
            { criterion: 'riesgo con mitigación', weight: 25, score: 25 },
            { criterion: 'estructura escaneable', weight: 25, score: 23 },
          ],
        },
      }),
    )

    expect(result.reasons).not.toContain('per_criterion_contradictory')
    expect(result.riskClass).toBe('batch_eligible')
  })

  it('caso REAL contradictorio: global 21 con aportes que suman 85 SÍ dispara la señal', () => {
    const result = routeScoredItem(
      cleanInput({
        proposal: {
          score: 21,
          rationale: 'Respuesta parcial.',
          perCriterion: [
            { criterion: 'actúa sin esperar', weight: 25, score: 25 },
            { criterion: 'contiene primero', weight: 25, score: 25 },
            { criterion: 'comunica', weight: 25, score: 15 },
            { criterion: 'deja aprendizaje', weight: 25, score: 20 },
          ],
        },
      }),
    )

    expect(result.riskClass).toBe('mandatory_review')
    expect(result.reasons).toContain('per_criterion_contradictory')
  })

  it('un criterio suelto lejos del global NO basta: contradice el AGREGADO, no un criterio', () => {
    // Criterio en 0 y otro en 45: el agregado (85) sigue coherente con el global (85).
    const result = routeScoredItem(
      cleanInput({
        responseId: findNonSampledResponseId(),
        proposal: {
          score: 85,
          rationale: 'Fuerte salvo en un criterio.',
          perCriterion: [
            { criterion: 'a', weight: 25, score: 25 },
            { criterion: 'b', weight: 25, score: 25 },
            { criterion: 'c', weight: 25, score: 0 },
            { criterion: 'd', weight: 25, score: 35 },
          ],
        },
      }),
    )

    expect(result.reasons).not.toContain('per_criterion_contradictory')
  })

  it('renormaliza pesos que no suman 100 antes de comparar', () => {
    // 40 aportes sobre 50 puntos declarados → implica 80: coherente con el global 85.
    const result = routeScoredItem(
      cleanInput({
        responseId: findNonSampledResponseId(),
        proposal: {
          score: 85,
          rationale: 'ok',
          perCriterion: [
            { criterion: 'a', weight: 30, score: 25 },
            { criterion: 'b', weight: 20, score: 15 },
          ],
        },
      }),
    )

    expect(result.reasons).not.toContain('per_criterion_contradictory')
  })
})

describe('routeScoredItem — default conservador (en duda → mandatory_review)', () => {
  it('policy de excepción OFF → TODO item limpio es mandatory_review (exception_policy_disabled)', () => {
    const result = routeScoredItem(
      cleanInput({ responseId: findNonSampledResponseId(), exceptionPolicyEnabled: false }),
    )

    expect(result.riskClass).toBe('mandatory_review')
    expect(result.reasons).toEqual(['exception_policy_disabled'])
  })

  it('policy OFF con señales de riesgo → las señales dominan como evidencia', () => {
    const result = routeScoredItem(cleanInput({ answerText: '', exceptionPolicyEnabled: false }))

    expect(result.riskClass).toBe('mandatory_review')
    expect(result.reasons).toContain('answer_empty')
  })
})

describe('routeScoredItem — muestra ciega determinística', () => {
  it('usa hash de (runId, responseId) — jamás Math.random: mismo input, misma clase', () => {
    const input = cleanInput({ responseId: findSampledResponseId() })

    const first = routeScoredItem(input)
    const second = routeScoredItem(input)

    expect(first.riskClass).toBe('quality_sample')
    expect(first.reasons).toEqual(['blind_quality_sample'])
    expect(second).toEqual(first)
  })

  it('isBlindQualitySample es determinística y respeta bordes de tasa', () => {
    expect(isBlindQualitySample('r', 'a', 0)).toBe(false)
    expect(isBlindQualitySample('r', 'a', 1)).toBe(true)
    expect(isBlindQualitySample('asrun-1', 'arsp-x', 0.1)).toBe(isBlindQualitySample('asrun-1', 'arsp-x', 0.1))

    // La tasa efectiva sobre una población grande queda cerca del 10% configurado.
    const hits = Array.from({ length: 2000 }, (_, i) =>
      isBlindQualitySample('asrun-1', `arsp-${i}`, 0.1),
    ).filter(Boolean).length

    expect(hits).toBeGreaterThan(120)
    expect(hits).toBeLessThan(280)
  })

  it('la muestra solo se sortea entre items sin señales de riesgo (blind sample among eligible)', () => {
    const sampled = findSampledResponseId()
    const withSignal = routeScoredItem(cleanInput({ responseId: sampled, competencyWeight: 60 }))

    expect(withSignal.riskClass).toBe('mandatory_review')
    expect(withSignal.reasons).not.toContain('blind_quality_sample')
  })
})

describe('routeScoredItem — batch_eligible', () => {
  it('sin señales, policy ON y fuera de la muestra → batch_eligible con no_risk_signals', () => {
    const result = routeScoredItem(cleanInput({ responseId: findNonSampledResponseId() }))

    expect(result.riskClass).toBe('batch_eligible')
    expect(result.reasons).toEqual(['no_risk_signals'])
  })
})
