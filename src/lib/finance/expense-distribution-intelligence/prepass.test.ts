import { describe, expect, it } from 'vitest'

import { buildRulesOnlySuggestions } from './prepass'
import type { ExpenseDistributionReviewQueueItem } from '@/lib/finance/expense-distribution/repository'

const queueItem = (overrides: Partial<ExpenseDistributionReviewQueueItem>): ExpenseDistributionReviewQueueItem => ({
  resolutionId: 'edr-1',
  distributionLane: 'unallocated',
  resolutionStatus: 'manual_required',
  confidence: 'manual_required',
  amountClp: 100_000,
  evidence: {},
  riskFlags: [],
  expense: {
    expenseId: 'EXP-1',
    periodYear: 2026,
    periodMonth: 4,
    totalAmountClp: 100_000,
    effectiveCostAmountClp: 100_000,
    economicCategory: 'other',
    supplierName: null,
    description: null
  },
  ...overrides
})

describe('buildRulesOnlySuggestions', () => {
  it('suggests shared_financial_cost for factoring-like ambiguous expenses', () => {
    const [suggestion] = buildRulesOnlySuggestions([
      queueItem({
        expense: {
          ...queueItem({}).expense,
          supplierName: 'Xepelin',
          description: 'Interes factoring'
        }
      })
    ])

    expect(suggestion?.suggestedDistributionLane).toBe('shared_financial_cost')
    expect(suggestion?.requiresHumanApproval).toBe(true)
    expect(suggestion?.evidence.closeImpact).toBe('review_before_close')
  })

  it('suggests regulatory_payment for Previred-like ambiguous expenses', () => {
    const [suggestion] = buildRulesOnlySuggestions([
      queueItem({
        expense: {
          ...queueItem({}).expense,
          supplierName: 'Previred',
          description: 'Cotizaciones previsionales'
        }
      })
    ])

    expect(suggestion?.suggestedDistributionLane).toBe('regulatory_payment')
  })
})
