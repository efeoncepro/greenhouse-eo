import { describe, expect, it } from 'vitest'

import { parseSuggestionArray } from './validation'

describe('reconciliation intelligence output validation', () => {
  it('accepts structured suggestions and forces human approval', () => {
    const suggestions = parseSuggestionArray({
      suggestions: [
        {
          suggestionType: 'match',
          confidence: 1.25,
          proposedAction: {
            action: 'open_match_dialog',
            targetIds: ['row-1', 'leg-1'],
            payload: { rowId: 'row-1', candidateId: 'leg-1' }
          },
          evidenceFactors: [{ factor: 'amount', weight: 2, observed: 'Monto exacto' }],
          rationale: 'Existe coincidencia por monto y fecha.',
          simulation: { currentDifference: 5000, projectedDifference: 0, affectedRows: ['row-1'] }
        }
      ]
    }, () => 'EO-RCI-test')

    expect(suggestions).toHaveLength(1)
    expect(suggestions[0].confidence).toBe(1)
    expect(suggestions[0].requiresApproval).toBe(true)
    expect(suggestions[0].proposedAction.action).toBe('open_match_dialog')
    expect(suggestions[0].evidenceFactors[0].weight).toBe(1)
  })

  it('drops unsupported or rationale-free model output', () => {
    const suggestions = parseSuggestionArray([
      { suggestionType: 'unsafe_write', confidence: 0.9, rationale: 'x' },
      { suggestionType: 'match', confidence: 0.9, rationale: '' }
    ], () => 'EO-RCI-test')

    expect(suggestions).toEqual([])
  })
})
