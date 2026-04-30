import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const executedSql: string[] = []
const queuedResults: Array<{ rows: Array<Record<string, unknown>> }> = []
const mockGetBankOverview = vi.fn()

const renderSql = (strings: TemplateStringsArray) =>
  strings.reduce(
    (query, fragment, index) => `${query}${fragment}${index < strings.length - 1 ? `$${index + 1}` : ''}`,
    ''
  )

vi.mock('kysely', () => ({
  sql: (strings: TemplateStringsArray) => ({
    execute: vi.fn(async () => {
      executedSql.push(renderSql(strings))

      return queuedResults.shift() ?? { rows: [] }
    })
  })
}))

vi.mock('@/lib/db', () => ({
  getDb: vi.fn(async () => ({}))
}))

vi.mock('@/lib/finance/account-balances', () => ({
  getBankOverview: (...args: unknown[]) => mockGetBankOverview(...args)
}))

import {
  buildRollingMonths,
  getCashPositionOverview,
  resolvePaymentAmountClp
} from '@/lib/finance/cash-position/overview'

const baseBankOverview = {
  period: {
    year: 2026,
    month: 4,
    startDate: '2026-04-01',
    endDate: '2026-04-29',
    isCurrentPeriod: true
  },
  kpis: {
    totalClp: 4_181_125,
    totalUsd: 0,
    consolidatedClp: 4_181_125,
    activeAccounts: 2,
    fxGainLossClp: 12_000,
    fxGainLoss: {
      totalClp: 12_000,
      realizedClp: 10_000,
      translationClp: 2_000,
      internalTransferClp: 0,
      hasExposure: true,
      isDegraded: false
    },
    coverage: { assignedCount: 0, totalCount: 0, coveragePct: 0, unassignedCount: 0 },
    breakdown: {
      cash: 4_181_125,
      credit: 1_141_273,
      platformInternal: 172_495
    },
    netWorthClp: 2_867_357
  },
  accounts: [
    {
      accountId: 'santander-clp',
      accountName: 'Santander CLP',
      bankName: 'Santander',
      currency: 'CLP',
      instrumentCategory: 'bank_account',
      providerSlug: 'santander',
      accountType: 'checking',
      openingBalance: 3_900_000,
      periodInflows: 20_000_000,
      periodOutflows: 18_000_000,
      closingBalance: 4_181_125,
      closingBalanceClp: 4_181_125,
      fxRateUsed: null,
      fxGainLossClp: 0,
      fxGainLossRealizedClp: 0,
      fxGainLossTranslationClp: 0,
      transactionCount: 10,
      lastTransactionAt: '2026-04-29T00:00:00.000Z',
      isPeriodClosed: false,
      discrepancy: 0,
      reconciliationStatus: 'open',
      reconciliationPeriodId: 'rec-2026-04',
      creditLimit: null,
      metadata: null,
      accountKind: 'asset',
      cardLastFour: null,
      cardNetwork: null,
      drift: null
    }
  ],
  creditCards: [],
  unassignedPayments: [],
  freshness: {
    lastMaterializedAt: '2026-04-29T12:00:00.000Z',
    ageSeconds: 300,
    isStale: false,
    label: 'Hace 5 minutos'
  }
}

describe('cash-position overview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    executedSql.length = 0
    queuedResults.length = 0
    mockGetBankOverview.mockResolvedValue(baseBankOverview)
  })

  it('prefers amount_clp for CLP payments tied to USD documents', () => {
    const amount = resolvePaymentAmountClp({
      amountClp: 1_106_321,
      amount: 1_106_321,
      exchangeRateAtPayment: 1,
      documentExchangeRateToClp: 910.552263
    })

    expect(amount).toBe(1_106_321)
    expect(amount).not.toBeCloseTo(1_007_363_090)
  })

  it('falls back to payment rate before document rate when amount_clp is absent', () => {
    expect(
      resolvePaymentAmountClp({
        amountClp: null,
        amount: 100,
        exchangeRateAtPayment: 920,
        documentExchangeRateToClp: 910
      })
    ).toBe(92_000)
  })

  it('builds a stable 12-month rolling window ending in the selected period', () => {
    expect(buildRollingMonths(2026, 4)).toEqual([
      { year: 2025, month: 5 },
      { year: 2025, month: 6 },
      { year: 2025, month: 7 },
      { year: 2025, month: 8 },
      { year: 2025, month: 9 },
      { year: 2025, month: 10 },
      { year: 2025, month: 11 },
      { year: 2025, month: 12 },
      { year: 2026, month: 1 },
      { year: 2026, month: 2 },
      { year: 2026, month: 3 },
      { year: 2026, month: 4 }
    ])
  })

  it('uses Banco as read-only input and keeps payment fallback guarded by amount_clp and supersede filters', async () => {
    queuedResults.push(
      {
        rows: [
          {
            year: 2026,
            month: 4,
            cash_in_clp: '0',
            cash_out_clp: '0',
            snapshot_count: '0'
          }
        ]
      },
      {
        rows: [
          {
            year: 2026,
            month: 4,
            cash_in_clp: '0',
            cash_out_clp: '1106321',
            snapshot_count: '0'
          }
        ]
      },
      { rows: [{ total_clp: '2000000', pending_count: '2' }] },
      { rows: [{ total_clp: '500000', pending_count: '1' }] }
    )

    const overview = await getCashPositionOverview({
      year: 2026,
      month: 4,
      actorUserId: 'user-test',
      spaceId: 'space-efeonce'
    })

    expect(mockGetBankOverview).toHaveBeenCalledWith({
      year: 2026,
      month: 4,
      actorUserId: 'user-test',
      materialize: 'skip'
    })
    expect(overview.kpis.cashAvailableClp).toBe(4_181_125)
    expect(overview.kpis.netPositionClp).toBe(4_539_852)
    expect(overview.monthlySeries.at(-1)).toMatchObject({
      year: 2026,
      month: 4,
      cashOutClp: 1_106_321,
      source: 'legacy_safe_fallback',
      isDegraded: true
    })

    const allSql = executedSql.join('\n')

    expect(allSql).toContain('greenhouse_finance.account_balances_monthly')
    expect(allSql).toContain('ip.amount_clp')
    expect(allSql).toContain('ep.amount_clp')
    expect(allSql).toContain('superseded_by_payment_id IS NULL')
    expect(allSql).toContain('superseded_by_otb_id IS NULL')
    expect(allSql).toContain('superseded_at IS NULL')
    expect(allSql).toContain('space_id')
  })
})
