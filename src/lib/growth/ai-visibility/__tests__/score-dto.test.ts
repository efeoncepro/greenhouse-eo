import { describe, expect, it } from 'vitest'

import { type PersistedGraderScore } from '../scoring/engine'
import { toPublicSafeScore } from '../scoring/dto'

const SCORE: PersistedGraderScore = {
  scoreVersion: 'ai_visibility_score_v1',
  runId: 'run-1',
  overallScore: 42.5,
  scoreStatus: 'completed',
  autoReleasable: false,
  confidence: 0.8,
  evidenceCount: 9,
  coverage: { successfulObservations: 9, promptFamilies: 4 },
  reviewReasons: ['detalle interno sensible que NO debe filtrarse'],
  dimensions: [
    {
      key: 'ai_visibility',
      label: 'AI Visibility',
      weight: 25,
      score: 0,
      evidenceCount: 6,
      confidence: 0.85,
      reasons: ['Presente en 0/6 prompts de descubrimiento.']
    }
  ]
}

describe('growth/ai-visibility — public-safe score DTO', () => {
  it('expone el resumen ponderado sin reasons/evidencia interna', () => {
    const dto = toPublicSafeScore(SCORE)

    expect(dto.overallScore).toBe(42.5)
    expect(dto.scoreStatus).toBe('completed')
    expect(dto.dimensions[0]).toEqual({ key: 'ai_visibility', label: 'AI Visibility', weight: 25, score: 0 })
    // El DTO público NO incluye reasons, evidenceCount, coverage ni reviewReasons.
    expect('reasons' in dto.dimensions[0]).toBe(false)
    expect('evidenceCount' in dto.dimensions[0]).toBe(false)
    expect('reviewReasons' in dto).toBe(false)
    expect('coverage' in dto).toBe(false)
  })

  it('NO filtra texto interno/razones sensibles en el JSON serializado', () => {
    const serialized = JSON.stringify(toPublicSafeScore(SCORE))

    expect(serialized).not.toContain('detalle interno sensible')
    expect(serialized).not.toContain('Presente en 0/6')
  })
})
