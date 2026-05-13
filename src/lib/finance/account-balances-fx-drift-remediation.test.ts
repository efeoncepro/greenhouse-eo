import { beforeEach, describe, expect, it, vi } from 'vitest'

const listRowsMock = vi.fn()
const countRowsMock = vi.fn()
const pgQueryMock = vi.fn()
const rematerializeMock = vi.fn()
const refreshMonthlyBatchMock = vi.fn()

vi.mock('@/lib/reliability/queries/account-balances-fx-drift', () => ({
  listAccountBalancesFxDriftRows: (...args: unknown[]) => listRowsMock(...args),
  countAccountBalancesFxDriftRows: (...args: unknown[]) => countRowsMock(...args)
}))

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => pgQueryMock(...args)
}))

vi.mock('@/lib/finance/account-balances-rematerialize', () => ({
  rematerializeAccountBalanceRange: (...args: unknown[]) => rematerializeMock(...args)
}))

vi.mock('@/lib/finance/account-balances-monthly', () => ({
  refreshMonthlyBatch: (...args: unknown[]) => refreshMonthlyBatchMock(...args)
}))

import {
  planAccountBalancesFxDriftRemediation,
  remediateAccountBalancesFxDrift
} from './account-balances-fx-drift-remediation'

const santanderDriftRow = {
  accountId: 'santander-clp',
  accountName: 'Santander CLP',
  currency: 'CLP',
  balanceDate: '2026-05-01',
  isPeriodClosed: false,
  transactionCount: 0,
  persistedInflowsClp: '0.00',
  persistedOutflowsClp: '0.00',
  persistedClosingBalanceClp: '1615054.57',
  expectedInflowsClp: '0.00',
  expectedOutflowsClp: '402562.50',
  expectedClosingBalanceClp: '1212492.07',
  driftClp: '-402562.50',
  absDriftClp: '402562.50',
  evidenceRefs: {
    settlementLegs: 2,
    incomePayments: 0,
    expensePayments: 0
  },
  detectedAt: '2026-05-09T12:00:00.000Z'
}

beforeEach(() => {
  vi.clearAllMocks()
  listRowsMock.mockResolvedValue([])
  countRowsMock.mockResolvedValue(0)
  pgQueryMock.mockResolvedValue([])
  rematerializeMock.mockResolvedValue({
    accountId: 'santander-clp',
    seedDate: '2026-02-28',
    endDate: '2026-05-09',
    finalClosingBalance: 1212492.07,
    daysMaterialized: 70
  })
  refreshMonthlyBatchMock.mockResolvedValue({ refreshed: 4, skipped: 0, errors: 0 })
})

describe('account balances FX drift remediation', () => {
  it('classifies ISSUE-069 signature as open-period auto remediable without protected evidence', async () => {
    listRowsMock.mockResolvedValueOnce([santanderDriftRow])

    const plan = await planAccountBalancesFxDriftRemediation({ policy: 'auto_open_periods' })

    expect(plan.decisions[0]).toMatchObject({
      accountId: 'santander-clp',
      balanceDate: '2026-05-01',
      decision: 'auto_remediable',
      reason: 'open_period_drift_with_source_evidence'
    })
    expect(plan.decisions[0]?.evidence).toMatchObject({
      knownSeedBlindSpotSignature: true
    })
  })

  it('allows protected ISSUE-069 restatement only with explicit known bug policy', async () => {
    listRowsMock.mockResolvedValueOnce([santanderDriftRow])
    pgQueryMock.mockResolvedValueOnce([
      {
        account_id: 'santander-clp',
        balance_date: '2026-05-01',
        snapshot_id: 'snapshot-1',
        drift_status: 'accepted'
      }
    ])

    const plan = await planAccountBalancesFxDriftRemediation({ policy: 'known_bug_class_restatement' })

    expect(plan.decisions[0]).toMatchObject({
      decision: 'known_bug_class_restatement',
      reason: 'issue_069_seed_blind_spot_signature_with_protected_evidence'
    })
  })

  it('blocks protected drift under strict policy', async () => {
    listRowsMock.mockResolvedValueOnce([santanderDriftRow])
    pgQueryMock.mockResolvedValueOnce([
      {
        account_id: 'santander-clp',
        balance_date: '2026-05-01',
        snapshot_id: 'snapshot-1',
        drift_status: 'reconciled'
      }
    ])

    const plan = await planAccountBalancesFxDriftRemediation({ policy: 'strict_no_restatement' })

    expect(plan.decisions[0]).toMatchObject({
      decision: 'blocked_reconciled_or_closed',
      reason: 'accepted_or_reconciled_snapshot_exists'
    })
  })

  it('blocks the whole run when bounded limits are exceeded', async () => {
    listRowsMock.mockResolvedValueOnce([
      santanderDriftRow,
      { ...santanderDriftRow, accountId: 'bci-clp', accountName: 'BCI CLP' }
    ])

    const plan = await planAccountBalancesFxDriftRemediation({ maxRows: 1 })

    expect(plan.overflow.rows).toBe(true)
    expect(plan.decisions).toHaveLength(1)
    expect(plan.decisions[0]?.decision).toBe('blocked_out_of_policy')
    expect(plan.decisions[0]?.reason).toBe('bounded_run_limits_exceeded')
  })

  it('dry-run writes audit and does not rematerialize', async () => {
    listRowsMock.mockResolvedValueOnce([santanderDriftRow])
    countRowsMock.mockResolvedValueOnce(1)

    const result = await remediateAccountBalancesFxDrift({
      policy: 'detect_only',
      dryRun: true,
      triggeredBy: 'test'
    })

    expect(result.status).toBe('succeeded')
    expect(result.driftRowsRemediated).toBe(0)
    expect(rematerializeMock).not.toHaveBeenCalled()
    expect(pgQueryMock.mock.calls[0]?.[0]).toContain('INSERT INTO greenhouse_sync.source_sync_runs')
    expect(pgQueryMock.mock.calls.at(-1)?.[0]).toContain('UPDATE greenhouse_sync.source_sync_runs')
  })

  it('rematerializes eligible accounts with canonical evidence guard and refreshes monthly snapshots', async () => {
    listRowsMock.mockResolvedValueOnce([santanderDriftRow])
    countRowsMock.mockResolvedValueOnce(0)

    const result = await remediateAccountBalancesFxDrift({
      policy: 'auto_open_periods',
      dryRun: false,
      toDate: '2026-05-09'
    })

    expect(result.status).toBe('succeeded')
    expect(result.accountsRematerialized).toBe(1)
    expect(rematerializeMock).toHaveBeenCalledWith(expect.objectContaining({
      accountId: 'santander-clp',
      seedDate: '2026-05-01',
      endDate: '2026-05-09',
      seedMode: 'active_otb',
      evidenceGuard: { mode: 'block_on_reconciled_drift' }
    }))
    expect(refreshMonthlyBatchMock).toHaveBeenCalled()
  })

  describe('TASK-871 — rolling_window_repair policy', () => {
    it('classifies seed-blind-spot signature as rolling_window_repair_eligible', async () => {
      listRowsMock.mockResolvedValueOnce([santanderDriftRow])

      const plan = await planAccountBalancesFxDriftRemediation({
        policy: 'rolling_window_repair'
      })

      expect(plan.decisions[0]).toMatchObject({
        decision: 'auto_remediable',
        reason: 'rolling_window_repair_eligible'
      })
    })

    it('does NOT auto-remediate rows that do not match the seed-blind-spot signature', async () => {
      // Drift row WITHOUT the signature — transactionCount > 0
      const nonSignatureRow = {
        ...santanderDriftRow,
        transactionCount: 5,
        persistedInflowsClp: '100000.00',
        persistedOutflowsClp: '50000.00'
      }

      listRowsMock.mockResolvedValueOnce([nonSignatureRow])

      const plan = await planAccountBalancesFxDriftRemediation({
        policy: 'rolling_window_repair'
      })

      expect(plan.decisions[0]).toMatchObject({
        decision: 'unknown_requires_review',
        reason: 'rolling_window_repair_signature_mismatch'
      })
    })

    it('blocks rolling repair when protected snapshot exists on the exact affected day', async () => {
      listRowsMock.mockResolvedValueOnce([santanderDriftRow])
      pgQueryMock.mockResolvedValueOnce([
        {
          account_id: 'santander-clp',
          balance_date: '2026-05-01',
          snapshot_id: 'snapshot-1',
          drift_status: 'reconciled'
        }
      ])

      const plan = await planAccountBalancesFxDriftRemediation({
        policy: 'rolling_window_repair'
      })

      expect(plan.decisions[0]).toMatchObject({
        decision: 'blocked_reconciled_or_closed',
        reason: 'accepted_or_reconciled_snapshot_exists'
      })
    })

    it('uses seedMode=explicit + block_on_reconciled_drift guard when executing rolling repair', async () => {
      listRowsMock.mockResolvedValueOnce([santanderDriftRow])
      countRowsMock.mockResolvedValueOnce(0)

      // pgQueryMock flow per call:
      //  1. listProtectedEvidence → no protected evidence on 2026-05-01
      //  2. writeRunStart audit INSERT
      //  3. resolveCleanSeedDate first day check (candidate=2026-04-30, clean)
      //  4. seed opening balance lookup
      //  5. writeRunComplete audit UPDATE
      pgQueryMock
        .mockResolvedValueOnce([]) // protected evidence query
        .mockResolvedValueOnce([]) // writeRunStart
        .mockResolvedValueOnce([
          {
            settlement_legs: '0',
            income_payments: '0',
            expense_payments: '0'
          }
        ]) // resolveCleanSeedDate(candidate=2026-04-30)
        .mockResolvedValueOnce([{ closing_balance: '1212492.07' }]) // opening lookup
        .mockResolvedValueOnce([]) // writeRunComplete

      rematerializeMock.mockResolvedValueOnce({
        accountId: 'santander-clp',
        seedDate: '2026-04-30',
        endDate: '2026-05-09',
        finalClosingBalance: 1615054.57,
        daysMaterialized: 9
      })

      const result = await remediateAccountBalancesFxDrift({
        policy: 'rolling_window_repair',
        dryRun: false,
        toDate: '2026-05-09'
      })

      expect(result.status).toBe('succeeded')
      expect(result.accountsRematerialized).toBe(1)
      expect(rematerializeMock).toHaveBeenCalledWith(expect.objectContaining({
        accountId: 'santander-clp',
        seedDate: '2026-04-30',
        endDate: '2026-05-09',
        seedMode: 'explicit',
        openingBalance: 1212492.07,
        evidenceGuard: { mode: 'block_on_reconciled_drift' }
      }))
      expect(result.runs[0]).toMatchObject({
        accountId: 'santander-clp',
        seedMode: 'explicit',
        evidenceGuardMode: 'block_on_reconciled_drift'
      })
    })

    it('records cleanSeedExpansion telemetry when seed walked backward', async () => {
      listRowsMock.mockResolvedValueOnce([santanderDriftRow])
      countRowsMock.mockResolvedValueOnce(0)

      pgQueryMock
        .mockResolvedValueOnce([]) // protected evidence query
        .mockResolvedValueOnce([]) // writeRunStart
        // resolveCleanSeedDate walks 2026-04-30 (dirty) → 2026-04-29 (clean)
        .mockResolvedValueOnce([
          {
            settlement_legs: '1',
            income_payments: '0',
            expense_payments: '0'
          }
        ])
        .mockResolvedValueOnce([
          {
            settlement_legs: '0',
            income_payments: '0',
            expense_payments: '0'
          }
        ])
        .mockResolvedValueOnce([{ closing_balance: '1212492.07' }])
        .mockResolvedValueOnce([])

      rematerializeMock.mockResolvedValueOnce({
        accountId: 'santander-clp',
        seedDate: '2026-04-29',
        endDate: '2026-05-09',
        finalClosingBalance: 1615054.57,
        daysMaterialized: 10
      })

      const result = await remediateAccountBalancesFxDrift({
        policy: 'rolling_window_repair',
        dryRun: false,
        toDate: '2026-05-09'
      })

      expect(result.runs[0]?.cleanSeedExpansion).toEqual({
        originalSeed: '2026-04-30',
        cleanSeed: '2026-04-29',
        daysExpanded: 1
      })
    })

    it('skips the account when integrity check exceeds maxExpandDays', async () => {
      listRowsMock.mockResolvedValueOnce([santanderDriftRow])
      countRowsMock.mockResolvedValueOnce(1)

      // protected evidence empty + writeRunStart + 31 dirty days from
      // 2026-04-30 backward to 2026-03-30 (the default maxExpand=30) + writeRunComplete.
      const calls: Array<Promise<unknown[]>> = [
        Promise.resolve([]), // protected evidence
        Promise.resolve([]) // writeRunStart
      ]

      for (let i = 0; i < 31; i++) {
        calls.push(
          Promise.resolve([
            { settlement_legs: '1', income_payments: '0', expense_payments: '0' }
          ])
        )
      }

      calls.push(Promise.resolve([])) // writeRunComplete

      let callIndex = 0

      pgQueryMock.mockImplementation(() => calls[callIndex++])

      const result = await remediateAccountBalancesFxDrift({
        policy: 'rolling_window_repair',
        dryRun: false,
        toDate: '2026-05-09'
      })

      // The rematerializer is never invoked when integrity check fails.
      expect(rematerializeMock).not.toHaveBeenCalled()
      expect(result.runs).toHaveLength(1)
      expect(result.runs[0]).toMatchObject({
        accountId: 'santander-clp',
        seedMode: 'explicit',
        evidenceGuardMode: 'block_on_reconciled_drift',
        skipped: {
          reason: 'integrity_check_exceeded_max_expand'
        }
      })
      expect(result.accountsRematerialized).toBe(0)
    })
  })
})
