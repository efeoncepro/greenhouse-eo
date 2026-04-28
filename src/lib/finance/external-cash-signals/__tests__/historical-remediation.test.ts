import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRunGreenhousePostgresQuery = vi.fn()
const mockEvaluateSignalAccount = vi.fn()
const mockDismissIncomePhantom = vi.fn()
const mockDismissExpensePhantom = vi.fn()
const mockParseAccountId = vi.fn()
const mockWithTransaction = vi.fn()
const mockPublishOutboxEvent = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args)
}))

vi.mock('@/lib/finance/external-cash-signals/rule-evaluator', () => ({
  evaluateSignalAccount: (...args: unknown[]) => mockEvaluateSignalAccount(...args),
  EVALUATOR_VERSION: '1.0.0'
}))

vi.mock('@/lib/finance/payment-instruments/dismiss-phantom', () => ({
  dismissIncomePhantom: (...args: unknown[]) => mockDismissIncomePhantom(...args),
  dismissExpensePhantom: (...args: unknown[]) => mockDismissExpensePhantom(...args)
}))

vi.mock('@/lib/finance/types/account-id', () => ({
  parseAccountId: (...args: unknown[]) => mockParseAccountId(...args)
}))

vi.mock('@/lib/db', () => ({
  withTransaction: (fn: (client: unknown) => Promise<unknown>) => mockWithTransaction(fn)
}))

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: (...args: unknown[]) => mockPublishOutboxEvent(...args)
}))

import {
  applyHistoricalRemediation,
  classifyHistoricalSignal,
  type ClassificationProposal
} from '@/lib/finance/external-cash-signals/historical-remediation'

const baseProposal: ClassificationProposal = {
  signalId: 'signal-A1',
  documentKind: 'income',
  documentId: 'INC-NB-100',
  paymentId: 'PAY-NUBOX-inc-100',
  amount: 1000000,
  currency: 'CLP',
  signalDate: '2026-03-06',
  outcome: 'dismissed_no_cash',
  reason: 'TASK-708b: test reason 12345678',
  resolvedAccountId: null,
  evidence: {}
}

const baseClassifyInput = {
  signalId: 'signal-test-1',
  spaceId: 'spc-test',
  documentKind: 'income' as const,
  documentId: 'INC-NB-100',
  paymentId: 'PAY-NUBOX-inc-100',
  amount: 6_902_000,
  currency: 'CLP',
  signalDate: '2026-03-06',
  paymentMethod: 'bank_transfer',
  bankDescription: null
}

describe('TASK-708b — classifyHistoricalSignal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns repaired_with_account when bank_statement_row matches phantom payment', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([
      {
        row_id: 'santander-clp_2026_03_3bf2f840e20a',
        period_account_id: 'santander-clp',
        matched_settlement_leg_id: 'stlleg-PAY-NUBOX-inc-100',
        matched_payment_id: 'PAY-NUBOX-inc-100'
      }
    ])

    const proposal = await classifyHistoricalSignal(baseClassifyInput)

    expect(proposal.outcome).toBe('repaired_with_account')
    expect(proposal.resolvedAccountId).toBe('santander-clp')
    expect(proposal.evidence.matchedBankStatementRowId).toBe('santander-clp_2026_03_3bf2f840e20a')
    expect(proposal.evidence.matchedPeriodAccountId).toBe('santander-clp')
    expect(mockEvaluateSignalAccount).not.toHaveBeenCalled()
  })

  it('falls back to D5 rule evaluator when no bank_statement_row matches', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([])
    mockEvaluateSignalAccount.mockResolvedValueOnce({
      outcome: 'resolved',
      matchedRuleId: 'rule-nubox-clp-bank-transfer-santander',
      resolutionAccountId: 'santander-clp',
      attempt: { evaluatorVersion: '1.0.0' }
    })

    const proposal = await classifyHistoricalSignal(baseClassifyInput)

    expect(proposal.outcome).toBe('repaired_with_account')
    expect(proposal.resolvedAccountId).toBe('santander-clp')
    expect(proposal.evidence.matchingRule).toBe('rule-nubox-clp-bank-transfer-santander')
    expect(proposal.evidence.matchingOutcome).toBe('resolved')
  })

  it('defaults to dismissed_no_cash when neither bank row nor D5 rule resolves', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([])
    mockEvaluateSignalAccount.mockResolvedValueOnce({
      outcome: 'no_match',
      matchedRuleId: null,
      resolutionAccountId: null,
      attempt: { evaluatorVersion: '1.0.0' }
    })

    const proposal = await classifyHistoricalSignal(baseClassifyInput)

    expect(proposal.outcome).toBe('dismissed_no_cash')
    expect(proposal.resolvedAccountId).toBeNull()
    expect(proposal.reason).toMatch(/TASK-708b/)
    expect(proposal.reason.length).toBeGreaterThan(8)
  })

  it('treats ambiguous D5 outcome as dismissed_no_cash (conservative)', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([])
    mockEvaluateSignalAccount.mockResolvedValueOnce({
      outcome: 'ambiguous',
      matchedRuleId: null,
      resolutionAccountId: null,
      attempt: { evaluatorVersion: '1.0.0' }
    })

    const proposal = await classifyHistoricalSignal(baseClassifyInput)

    expect(proposal.outcome).toBe('dismissed_no_cash')
    expect(proposal.evidence.matchingOutcome).toBe('ambiguous')
  })
})

describe('TASK-708b — applyHistoricalRemediation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('dismisses income phantom when outcome is dismissed_no_cash', async () => {
    mockDismissIncomePhantom.mockResolvedValueOnce({
      incomeId: 'INC-NB-100',
      alreadyDismissed: false,
      recomputed: 0
    })
    mockRunGreenhousePostgresQuery.mockResolvedValue([])

    const result = await applyHistoricalRemediation({ ...baseProposal, outcome: 'dismissed_no_cash' }, 'user-actor-1')

    expect(result.applied).toBe(true)
    expect(result.alreadyResolved).toBe(false)
    expect(mockDismissIncomePhantom).toHaveBeenCalledWith({
      phantomPaymentId: 'PAY-NUBOX-inc-100',
      reason: baseProposal.reason,
      actorUserId: 'user-actor-1'
    })
  })

  it('marks alreadyResolved when phantom is idempotently dismissed', async () => {
    mockDismissIncomePhantom.mockResolvedValueOnce({
      incomeId: 'INC-NB-100',
      alreadyDismissed: true,
      recomputed: -1
    })
    mockRunGreenhousePostgresQuery.mockResolvedValue([])

    const result = await applyHistoricalRemediation({ ...baseProposal, outcome: 'dismissed_no_cash' }, 'user-actor-1')

    expect(result.alreadyResolved).toBe(true)
    expect(result.applied).toBe(false)
  })

  it('throws when repaired_with_account is missing resolvedAccountId', async () => {
    await expect(
      applyHistoricalRemediation(
        { ...baseProposal, outcome: 'repaired_with_account', resolvedAccountId: null },
        'user-actor-1'
      )
    ).rejects.toThrow(/requiere resolvedAccountId/)
  })

  it('rejects unknown documentKind for dismissal', async () => {
    await expect(
      applyHistoricalRemediation(
        { ...baseProposal, outcome: 'dismissed_no_cash', documentKind: 'unknown' as never },
        'user-actor-1'
      )
    ).rejects.toThrow(/no soportado/)
  })
})
