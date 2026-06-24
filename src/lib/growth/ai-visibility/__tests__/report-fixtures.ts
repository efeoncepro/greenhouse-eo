/**
 * TASK-1235 — Fixtures compartidos para los tests del report builder.
 * NO es un archivo de test (sin `.test.ts`): provee builders deterministas.
 */

import { type NormalizedFinding } from '../normalization/contracts'
import { SCORE_DIMENSION_CONFIG_BY_KEY, type ScoreDimensionKey } from '../scoring/config'
import { type DimensionScore, type PersistedGraderScore } from '../scoring/engine'

export const makeDimension = (key: ScoreDimensionKey, score: number | null): DimensionScore => {
  const config = SCORE_DIMENSION_CONFIG_BY_KEY[key]

  return {
    key,
    label: config.label,
    weight: config.weight,
    score,
    evidenceCount: score === null ? 0 : 4,
    confidence: score === null ? 0 : 0.8,
    reasons: score === null ? [`Sin evidencia para ${config.label}.`] : [`Métrica de ${config.label}.`]
  }
}

/** Score con las 7 dimensiones; pasa scores parciales y el resto queda en 50 (atencion). */
export const makeScore = (
  scores: Partial<Record<ScoreDimensionKey, number | null>>,
  overrides: Partial<PersistedGraderScore> = {}
): PersistedGraderScore => {
  const dimensions = (Object.keys(SCORE_DIMENSION_CONFIG_BY_KEY) as ScoreDimensionKey[]).map(key =>
    makeDimension(key, key in scores ? (scores[key] ?? null) : 50)
  )

  const scored = dimensions.filter((d): d is DimensionScore & { score: number } => d.score !== null)
  const weightSum = scored.reduce((sum, d) => sum + d.weight, 0)

  const overallScore =
    weightSum === 0 ? null : Math.round((scored.reduce((sum, d) => sum + d.score * d.weight, 0) / weightSum) * 10) / 10

  return {
    scoreVersion: 'ai_visibility_score_v1',
    runId: 'run-fixture',
    overallScore,
    scoreStatus: 'completed',
    autoReleasable: false,
    confidence: 0.8,
    evidenceCount: scored.reduce((sum, d) => sum + d.evidenceCount, 0),
    coverage: { successfulObservations: 12, promptFamilies: 5 },
    reviewReasons: [],
    dimensions,
    ...overrides
  }
}

let findingCounter = 0

export const makeFinding = (overrides: Partial<NormalizedFinding> = {}): NormalizedFinding => {
  findingCounter += 1

  return {
    findingId: `finding-${findingCounter}`,
    runId: 'run-fixture',
    promptId: `p${String(findingCounter).padStart(2, '0')}`,
    provider: 'openai',
    brandMentioned: 'unknown',
    brandRank: null,
    competitorsMentioned: [],
    sentimentLabel: 'unknown',
    sentimentScore: null,
    categoryAssociations: [],
    messageDriftClaims: [],
    citationDomains: [],
    sourceTypes: [],
    commercialIntentMatch: 'unknown',
    confidence: 0.8,
    trustSignal: null,
    schemaVersion: 'normalized_finding_v1',
    ...overrides
  }
}
