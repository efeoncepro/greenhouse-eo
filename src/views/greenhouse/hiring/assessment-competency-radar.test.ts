import { describe, expect, it } from 'vitest'

import {
  competencyRadarLabelLines,
  isAssessmentRadarComplete,
  type AssessmentCompetencyRadarRow
} from './assessment-competency-radar'

const row = (overrides: Partial<AssessmentCompetencyRadarRow> = {}): AssessmentCompetencyRadarRow => ({
  competencyId: 'competency-1',
  competencyKey: 'client_relationship_comm',
  competencyName: 'Relación con el cliente y comunicación',
  score: 76,
  target: 72,
  pending: false,
  ...overrides
})

describe('assessment competency radar presentation', () => {
  it('uses governed human labels instead of technical competency keys', () => {
    expect(competencyRadarLabelLines('client_relationship_comm', 'Relación con el cliente y comunicación')).toEqual([
      'Cliente y',
      'comunicación'
    ])
  })

  it('wraps unknown human labels without cutting words', () => {
    expect(competencyRadarLabelLines('new_capability', 'Pensamiento estratégico interdisciplinario')).toEqual([
      'Pensamiento',
      'estratégico',
      'interdisciplinario'
    ])
  })

  it('only permits the candidate polygon for a complete scorecard', () => {
    expect(isAssessmentRadarComplete([row()])).toBe(true)
    expect(isAssessmentRadarComplete([row(), row({ competencyId: 'competency-2', score: null, pending: true })])).toBe(
      false
    )
    expect(isAssessmentRadarComplete([])).toBe(false)
  })
})
