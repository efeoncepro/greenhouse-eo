import { describe, expect, it } from 'vitest'

import baseline from './__fixtures__/eval-baseline-scoring.v1.json'
import { runScoringEval, type ScoringEvalCase } from './eval-runner'

// TASK-1361 Slice 4 — eval runner PURO con runOne fake (CI-safe, sin provider). Valida la
// aritmética del baseline (MAE, tolerancia, correlación, unscored honesto), no la calidad del LLM.

const cases = baseline.cases as ScoringEvalCase[]

describe('runScoringEval', () => {
  it('un grader perfecto → MAE 0, tolerancia 1, correlación 1', async () => {
    const report = await runScoringEval(cases, async (c) => ({ score: c.humanReferenceScore }))

    expect(report.total).toBe(cases.length)
    expect(report.scored).toBe(cases.length)
    expect(report.meanAbsoluteError).toBe(0)
    expect(report.withinToleranceRate).toBe(1)
    expect(report.pearson).toBeCloseTo(1, 5)
  })

  it('un grader con sesgo fijo (+10) → MAE 10, aún dentro de tolerancia 15', async () => {
    const report = await runScoringEval(cases, async (c) => ({ score: Math.min(100, c.humanReferenceScore + 10) }))

    expect(report.meanAbsoluteError).toBeGreaterThan(0)
    expect(report.meanAbsoluteError).toBeLessThanOrEqual(10)
    expect(report.withinToleranceRate).toBe(1)
  })

  it('casos sin score (provider degradó) se cuentan como unscored, no como divergencia', async () => {
    const report = await runScoringEval(cases, async () => ({ score: null }))

    expect(report.scored).toBe(0)
    expect(report.unscored).toBe(cases.length)
    expect(report.meanAbsoluteError).toBeNull()
    expect(report.pearson).toBeNull()
  })

  it('el fixture baseline tiene casos fuertes y débiles (spread de referencia)', () => {
    const refs = cases.map((c) => c.humanReferenceScore)

    expect(Math.max(...refs)).toBeGreaterThanOrEqual(85)
    expect(Math.min(...refs)).toBeLessThanOrEqual(25)
  })
})
