import { describe, expect, it } from 'vitest'

import { parseExpenseDistributionSuggestionArray } from './validation'

describe('parseExpenseDistributionSuggestionArray', () => {
  it('keeps only valid advisory suggestions and enforces human approval', () => {
    const suggestions = parseExpenseDistributionSuggestionArray(
      {
        suggestions: [
          {
            expenseId: 'EXP-1',
            suggestedDistributionLane: 'shared_financial_cost',
            confidence: 'medium',
            rationale: 'Factoring no debe entrar a overhead operacional.',
            evidence: {
              factors: [{ factor: 'text', observed: 'Xepelin factoring', weight: 0.9 }],
              riskFlags: ['financial_cost_review'],
              proposedRule: 'Factoring -> shared_financial_cost',
              closeImpact: 'review_before_close'
            },
            requiresHumanApproval: false
          },
          {
            expenseId: 'EXP-2',
            suggestedDistributionLane: 'not-a-lane',
            confidence: 'high',
            rationale: 'Invalid'
          }
        ]
      },
      () => 'ed-ai-test'
    )

    expect(suggestions).toHaveLength(1)
    expect(suggestions[0]).toMatchObject({
      suggestionId: 'ed-ai-test',
      expenseId: 'EXP-1',
      suggestedDistributionLane: 'shared_financial_cost',
      confidence: 'medium',
      requiresHumanApproval: true
    })
    expect(suggestions[0]?.evidence.closeImpact).toBe('review_before_close')
  })
})
