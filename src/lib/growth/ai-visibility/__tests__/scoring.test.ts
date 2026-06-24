import { describe, expect, it } from 'vitest'

import { createEmptyNormalizedFinding, type NormalizedFinding } from '../normalization/contracts'
import {
  AI_VISIBILITY_SCORE_VERSION,
  SCORE_DIMENSIONS,
  SCORE_TOTAL_WEIGHT
} from '../scoring/config'
import { computeGraderScore } from '../scoring/engine'

const finding = (over: Partial<NormalizedFinding> & { promptId: string; findingId: string }): NormalizedFinding => ({
  ...createEmptyNormalizedFinding({
    findingId: over.findingId,
    runId: 'run-1',
    promptId: over.promptId,
    provider: over.provider ?? 'openai'
  }),
  ...over
})

describe('growth/ai-visibility — scoring config V1', () => {
  it('los pesos suman 100', () => {
    expect(SCORE_TOTAL_WEIGHT).toBe(100)
    expect(SCORE_DIMENSIONS).toHaveLength(7)
  })

  it('cada dimensión tiene peso positivo y key única', () => {
    const keys = new Set(SCORE_DIMENSIONS.map(d => d.key))

    expect(keys.size).toBe(7)
    expect(SCORE_DIMENSIONS.every(d => d.weight > 0)).toBe(true)
  })
})

describe('growth/ai-visibility — scoring engine', () => {
  it('marca ausente en descubrimiento → AI Visibility 0 (piso real, como Efeonce)', () => {
    const findings = [
      finding({ findingId: 'f1', promptId: 'p01', brandMentioned: 'no', confidence: 0.85 }),
      finding({ findingId: 'f2', promptId: 'p03', brandMentioned: 'no', confidence: 0.85, competitorsMentioned: ['Cebra'] })
    ]

    const result = computeGraderScore('run-1', findings)
    const aiVis = result.dimensions.find(d => d.key === 'ai_visibility')

    expect(aiVis?.score).toBe(0)
    expect(aiVis?.evidenceCount).toBe(2)
    expect(result.scoreVersion).toBe(AI_VISIBILITY_SCORE_VERSION)
  })

  it('marca presente en todo descubrimiento → AI Visibility 100 (techo, como BBDO)', () => {
    const findings = [
      finding({ findingId: 'f1', promptId: 'p01', brandMentioned: 'yes', confidence: 0.85 }),
      finding({ findingId: 'f2', promptId: 'p03', brandMentioned: 'yes', confidence: 0.85 })
    ]

    const aiVis = computeGraderScore('run-1', findings).dimensions.find(
      d => d.key === 'ai_visibility'
    )

    expect(aiVis?.score).toBe(100)
  })

  it('dimensión sin evidencia → score null y excluida del promedio ponderado', () => {
    // Solo discovery resuelto → message_alignment (prosa) sin evidencia.
    const findings = [finding({ findingId: 'f1', promptId: 'p03', brandMentioned: 'no', confidence: 0.85 })]
    const result = computeGraderScore('run-1', findings)
    const msg = result.dimensions.find(d => d.key === 'message_alignment')

    expect(msg?.score).toBeNull()
    expect(msg?.evidenceCount).toBe(0)
    // overall computado solo sobre dimensiones con evidencia.
    expect(result.overallScore).not.toBeNull()
  })

  it('overallScore en bounds 0..100 y determinista (recompute = mismo score)', () => {
    const findings = [
      finding({ findingId: 'f1', promptId: 'p01', brandMentioned: 'no', confidence: 0.8 }),
      finding({ findingId: 'f2', promptId: 'p14', brandMentioned: 'yes', confidence: 0.8, citationDomains: ['efeoncepro.com'], sourceTypes: ['owned'] }),
      finding({ findingId: 'f3', promptId: 'p03', brandMentioned: 'no', confidence: 0.8, competitorsMentioned: ['Cebra'] })
    ]

    const a = computeGraderScore('run-1', findings)
    const b = computeGraderScore('run-1', findings)

    expect(a.overallScore).toBeGreaterThanOrEqual(0)
    expect(a.overallScore).toBeLessThanOrEqual(100)
    expect(a.overallScore).toBe(b.overallScore)
    expect(a.dimensions).toEqual(b.dimensions)
  })

  it('competitive SoV: marca pierde frente a competidores → score < 50', () => {
    const findings = [
      finding({ findingId: 'f1', promptId: 'p03', brandMentioned: 'no', confidence: 0.85, competitorsMentioned: ['Cebra', 'BBDO'] }),
      finding({ findingId: 'f2', promptId: 'p01', brandMentioned: 'no', confidence: 0.85, competitorsMentioned: ['Wunderman'] })
    ]

    const sov = computeGraderScore('run-1', findings).dimensions.find(
      d => d.key === 'competitive_sov'
    )

    expect(sov?.score).toBe(0) // 0 marca / 3 competidores
  })

  it('sin findings → overallScore null (insufficient, sin inventar)', () => {
    const result = computeGraderScore('run-1', [])

    expect(result.overallScore).toBeNull()
    expect(result.coverage.successfulObservations).toBe(0)
  })
})
