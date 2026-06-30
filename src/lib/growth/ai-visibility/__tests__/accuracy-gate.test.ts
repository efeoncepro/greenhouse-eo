import { describe, expect, it } from 'vitest'

import { type AccuracyFinding } from '../accuracy'
import { type RawGraderScore } from '../scoring/engine'
import { BRAND_ACCURACY_REVIEW_REASON, resolveScoreStatus } from '../review-gates/gates'
import { makeFinding } from './report-fixtures'

// Score crudo con cobertura suficiente (no insufficient_data) y sin riesgo de lenguaje.
const healthyRaw: RawGraderScore = {
  scoreVersion: 'ai_visibility_score_v1',
  runId: 'run-acc',
  overallScore: 40,
  dimensions: [],
  confidence: 0.8,
  evidenceCount: 6,
  coverage: { successfulObservations: 6, promptFamilies: 3 }
}

// 6 findings resueltos (brandMentioned != unknown) para pasar el gate de cobertura.
const resolvedFindings = Array.from({ length: 6 }, () => makeFinding({ brandMentioned: 'yes' }))

const highAccuracy: AccuracyFinding[] = [
  { kind: 'entity_collision', confidence: 'high', evidenceCount: 2, reason: 'x' }
]

const lowAccuracy: AccuracyFinding[] = [
  { kind: 'misattribution', confidence: 'low', evidenceCount: 1, reason: 'x' }
]

describe('growth/ai-visibility — review gate brand accuracy escalation (TASK-1238)', () => {
  it('inexactitud de marca PROBABLE (high) → review_required con su razón', () => {
    const status = resolveScoreStatus(healthyRaw, resolvedFindings, highAccuracy)

    expect(status.scoreStatus).toBe('review_required')
    expect(status.reviewReasons).toContain(BRAND_ACCURACY_REVIEW_REASON)
    expect(status.autoReleasable).toBe(false)
  })

  it('inexactitud de baja confianza NO escala (conservador, no sobre-escala)', () => {
    const status = resolveScoreStatus(healthyRaw, resolvedFindings, lowAccuracy)

    expect(status.scoreStatus).toBe('completed')
    expect(status.reviewReasons).not.toContain(BRAND_ACCURACY_REVIEW_REASON)
  })

  it('sin accuracy findings → comportamiento previo intacto (backward compatible)', () => {
    expect(resolveScoreStatus(healthyRaw, resolvedFindings).scoreStatus).toBe('completed')
    expect(resolveScoreStatus(healthyRaw, resolvedFindings, []).scoreStatus).toBe('completed')
  })

  it('insufficient_data manda sobre accuracy (cobertura primero)', () => {
    const thinRaw: RawGraderScore = { ...healthyRaw, coverage: { successfulObservations: 1, promptFamilies: 1 } }
    const status = resolveScoreStatus(thinRaw, [makeFinding({ brandMentioned: 'yes' })], highAccuracy)

    expect(status.scoreStatus).toBe('insufficient_data')
  })
})
