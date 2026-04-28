import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRunGreenhousePostgresQuery = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args),
  withGreenhousePostgresTransaction: vi.fn()
}))

import { EVALUATOR_VERSION, evaluateSignalAccount } from '@/lib/finance/external-cash-signals'

const baseSignal = {
  signalId: 'signal-test-1',
  sourceSystem: 'nubox',
  spaceId: 'space-1',
  amount: 100_000,
  currency: 'CLP',
  sourcePayload: {} as Record<string, unknown>
}

describe('TASK-708 D5 — rule evaluator', () => {
  beforeEach(() => {
    mockRunGreenhousePostgresQuery.mockReset()
  })

  it('rejects empty predicate as never matching (catch-all guard)', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([
        {
          rule_id: 'rule-empty',
          source_system: 'nubox',
          space_id: 'space-1',
          match_predicate_json: {},
          resolved_account_id: 'acc-A',
          priority: 100,
          is_active: true,
          expires_at: null
        }
      ])
      .mockResolvedValueOnce([])

    const result = await evaluateSignalAccount({ signal: baseSignal })

    expect(result.outcome).toBe('no_match')
    expect(result.matchedRuleId).toBeNull()
    expect(result.attempt.rulesEvaluated[0]?.matched).toBe(false)
    expect(result.attempt.rulesEvaluated[0]?.reason).toBe('empty_predicate')
  })

  it('returns resolved when exactly one rule matches', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([
        {
          rule_id: 'rule-A',
          source_system: 'nubox',
          space_id: 'space-1',
          match_predicate_json: { currency_eq: 'CLP', amount_min: 50_000 },
          resolved_account_id: 'acc-CLP',
          priority: 100,
          is_active: true,
          expires_at: null
        }
      ])
      .mockResolvedValueOnce([])

    const result = await evaluateSignalAccount({ signal: baseSignal })

    expect(result.outcome).toBe('resolved')
    expect(result.matchedRuleId).toBe('rule-A')
    expect(result.resolutionAccountId).toBe('acc-CLP')
  })

  it('returns ambiguous when 2+ rules match (priority does NOT decide)', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([
        {
          rule_id: 'rule-A',
          source_system: 'nubox',
          space_id: 'space-1',
          match_predicate_json: { currency_eq: 'CLP' },
          resolved_account_id: 'acc-A',
          priority: 200,
          is_active: true,
          expires_at: null
        },
        {
          rule_id: 'rule-B',
          source_system: 'nubox',
          space_id: 'space-1',
          match_predicate_json: { amount_min: 1 },
          resolved_account_id: 'acc-B',
          priority: 100,
          is_active: true,
          expires_at: null
        }
      ])
      .mockResolvedValueOnce([])

    const result = await evaluateSignalAccount({ signal: baseSignal })

    expect(result.outcome).toBe('ambiguous')
    expect(result.matchedRuleId).toBeNull()
    expect(result.resolutionAccountId).toBeNull()
    expect(result.attempt.rulesEvaluated.filter(r => r.matched)).toHaveLength(2)
  })

  it('returns no_match when no rule matches', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([
        {
          rule_id: 'rule-USD',
          source_system: 'nubox',
          space_id: 'space-1',
          match_predicate_json: { currency_eq: 'USD' },
          resolved_account_id: 'acc-USD',
          priority: 100,
          is_active: true,
          expires_at: null
        }
      ])
      .mockResolvedValueOnce([])

    const result = await evaluateSignalAccount({ signal: baseSignal })

    expect(result.outcome).toBe('no_match')
    expect(result.matchedRuleId).toBeNull()
  })

  it('rejects rule when amount is below min', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([
        {
          rule_id: 'rule-min',
          source_system: 'nubox',
          space_id: 'space-1',
          match_predicate_json: { amount_min: 200_000 },
          resolved_account_id: 'acc-X',
          priority: 100,
          is_active: true,
          expires_at: null
        }
      ])
      .mockResolvedValueOnce([])

    const result = await evaluateSignalAccount({ signal: baseSignal })

    expect(result.outcome).toBe('no_match')
    expect(result.attempt.rulesEvaluated[0]?.reason).toMatch(/amount_below_min/)
  })

  it('persists attempt log with evaluator version pinned', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([
        {
          rule_id: 'rule-A',
          source_system: 'nubox',
          space_id: 'space-1',
          match_predicate_json: { currency_eq: 'CLP' },
          resolved_account_id: 'acc-A',
          priority: 100,
          is_active: true,
          expires_at: null
        }
      ])
      .mockResolvedValueOnce([])

    const result = await evaluateSignalAccount({ signal: baseSignal })

    expect(result.attempt.evaluatorVersion).toBe(EVALUATOR_VERSION)
    expect(mockRunGreenhousePostgresQuery).toHaveBeenCalledTimes(2)
    const insertCall = mockRunGreenhousePostgresQuery.mock.calls[1]!

    expect(insertCall[0]).toMatch(/INSERT INTO greenhouse_finance.external_signal_resolution_attempts/)
    expect(insertCall[1]).toContain(EVALUATOR_VERSION)
  })

  it('matches bank_description_regex (case insensitive, unicode)', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([
        {
          rule_id: 'rule-desc',
          source_system: 'nubox',
          space_id: 'space-1',
          match_predicate_json: { bank_description_regex: 'TRANSFERENCIA.*SANTANDER' },
          resolved_account_id: 'acc-santander',
          priority: 100,
          is_active: true,
          expires_at: null
        }
      ])
      .mockResolvedValueOnce([])

    const result = await evaluateSignalAccount({
      signal: baseSignal,
      bankDescription: 'transferencia interbancaria santander 12345'
    })

    expect(result.outcome).toBe('resolved')
    expect(result.resolutionAccountId).toBe('acc-santander')
  })

  it('rejects malformed regex with explicit reason', async () => {
    mockRunGreenhousePostgresQuery
      .mockResolvedValueOnce([
        {
          rule_id: 'rule-bad-regex',
          source_system: 'nubox',
          space_id: 'space-1',
          match_predicate_json: { bank_description_regex: '(' },
          resolved_account_id: 'acc-X',
          priority: 100,
          is_active: true,
          expires_at: null
        }
      ])
      .mockResolvedValueOnce([])

    const result = await evaluateSignalAccount({
      signal: baseSignal,
      bankDescription: 'whatever'
    })

    expect(result.outcome).toBe('no_match')
    expect(result.attempt.rulesEvaluated[0]?.reason).toMatch(/^invalid_regex/)
  })
})
