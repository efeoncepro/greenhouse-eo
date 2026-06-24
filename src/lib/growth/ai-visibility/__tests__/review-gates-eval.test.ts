import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { createEmptyNormalizedFinding, type NormalizedFinding } from '../normalization/contracts'
import { runGoldenEval, type GoldenEvalCase } from '../evals/eval-runner'
import { computeGraderScore } from '../scoring/engine'
import { resolveScoreStatus } from '../review-gates/gates'

const goldenSet = JSON.parse(readFileSync(join(__dirname, '../evals/golden-set.v1.json'), 'utf8')) as {
  cases: GoldenEvalCase[]
}

const finding = (over: Partial<NormalizedFinding> & { promptId: string; findingId: string }): NormalizedFinding => ({
  ...createEmptyNormalizedFinding({
    findingId: over.findingId,
    runId: 'run-1',
    promptId: over.promptId,
    provider: over.provider ?? 'openai'
  }),
  ...over
})

// Cobertura suficiente: 3 resueltas sobre >=2 familias (p01 category_discovery,
// p03 provider_recommendation, p14 message_recall).
const coveredFindings = (): NormalizedFinding[] => [
  finding({ findingId: 'f1', promptId: 'p01', brandMentioned: 'no', confidence: 0.85 }),
  finding({ findingId: 'f2', promptId: 'p03', brandMentioned: 'no', confidence: 0.85, competitorsMentioned: ['Cebra'] }),
  finding({ findingId: 'f3', promptId: 'p14', brandMentioned: 'yes', confidence: 0.85, citationDomains: ['efeoncepro.com'], sourceTypes: ['owned'] })
]

describe('growth/ai-visibility — golden eval (no-regresión, TASK-1228 baseline)', () => {
  it('0 divergencias deterministas; ambiguous/prosa → llm_required', () => {
    const report = runGoldenEval(goldenSet.cases)

    expect(report.total).toBeGreaterThanOrEqual(8)
    expect(report.deterministicMismatches).toBe(0)
    // El golden set incluye el caso de colisión de entidad (gs07) → llm_required.
    expect(report.llmRequired).toBeGreaterThanOrEqual(1)
    // Y al menos las ausencias deterministas matchean.
    expect(report.deterministicMatches).toBeGreaterThanOrEqual(1)
  })
})

describe('growth/ai-visibility — review gates', () => {
  it('cobertura insuficiente → insufficient_data (no precisión falsa)', () => {
    const findings = [finding({ findingId: 'f1', promptId: 'p03', brandMentioned: 'no', confidence: 0.85 })]
    const raw = computeGraderScore('run-1', findings)
    const status = resolveScoreStatus(raw, findings)

    expect(status.scoreStatus).toBe('insufficient_data')
    expect(status.autoReleasable).toBe(false)
  })

  it('cobertura suficiente sin riesgo → completed', () => {
    const findings = coveredFindings()
    const status = resolveScoreStatus(computeGraderScore('run-1', findings), findings)

    expect(status.scoreStatus).toBe('completed')
    expect(status.autoReleasable).toBe(false)
  })

  it('lenguaje riesgoso/difamatorio → review_required', () => {
    const findings = [
      ...coveredFindings(),
      finding({ findingId: 'f4', promptId: 'p13', brandMentioned: 'yes', confidence: 0.8, messageDriftClaims: ['Acusaciones de fraude contra la marca.'] })
    ]

    const status = resolveScoreStatus(computeGraderScore('run-1', findings), findings)

    expect(status.scoreStatus).toBe('review_required')
    expect(status.reviewReasons.join(' ')).toMatch(/riesgoso|difamatorio/i)
  })

  it('sentimiento negativo de baja confianza → review_required (OQ#3 conservador)', () => {
    const findings = [
      ...coveredFindings(),
      finding({ findingId: 'f5', promptId: 'p13', brandMentioned: 'yes', sentimentLabel: 'negative', confidence: 0.4 })
    ]

    const status = resolveScoreStatus(computeGraderScore('run-1', findings), findings)

    expect(status.scoreStatus).toBe('review_required')
  })

  it('negativo de ALTA confianza NO fuerza review (no todo negativo)', () => {
    const findings = [
      ...coveredFindings(),
      finding({ findingId: 'f6', promptId: 'p13', brandMentioned: 'yes', sentimentLabel: 'negative', confidence: 0.9 })
    ]

    const status = resolveScoreStatus(computeGraderScore('run-1', findings), findings)

    expect(status.scoreStatus).toBe('completed')
  })

  it('auto_releasable SIEMPRE false en esta task (público fuera de scope)', () => {
    const findings = coveredFindings()
    const status = resolveScoreStatus(computeGraderScore('run-1', findings), findings)

    expect(status.autoReleasable).toBe(false)
  })
})
