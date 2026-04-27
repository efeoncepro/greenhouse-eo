import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const executedSql: string[] = []
const queuedResults: Array<{ rows: Array<Record<string, unknown>> }> = []

const renderSql = (strings: TemplateStringsArray) =>
  strings.reduce(
    (query, fragment, index) =>
      `${query}${fragment}${index < strings.length - 1 ? `$${index + 1}` : ''}`,
    ''
  )

vi.mock('kysely', () => {
  // Single mock used both as outer sql template AND as nested fragment.
  // When called as a tagged template it captures the rendered text and
  // returns an object with .execute. When the result of an inner call is
  // interpolated into the outer call, it's a no-op (execute never runs on it
  // — only on the outermost result).
  const sql = (strings: TemplateStringsArray) => ({
    execute: vi.fn(async () => {
      executedSql.push(renderSql(strings))

      return queuedResults.shift() ?? { rows: [] }
    })
  })

  return { sql }
})

vi.mock('@/lib/db', () => ({
  getDb: vi.fn(async () => ({}))
}))

import { getBankFxPnlBreakdown } from '@/lib/finance/fx-pnl'

describe('getBankFxPnlBreakdown', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    executedSql.length = 0
    queuedResults.length = 0
  })

  it('reads from the canonical fx_pnl_breakdown VIEW (single source of truth)', async () => {
    queuedResults.push({ rows: [] })

    await getBankFxPnlBreakdown({ year: 2026, month: 4 })

    expect(executedSql[0]).toContain('greenhouse_finance.fx_pnl_breakdown')
    // Guardrail: helper must never re-derive the equation from raw payment tables.
    expect(executedSql[0]).not.toContain('FROM greenhouse_finance.income_payments')
    expect(executedSql[0]).not.toContain('FROM greenhouse_finance.expense_payments')
  })

  it('returns hasExposure=false when only CLP accounts are active', async () => {
    queuedResults.push({
      rows: [
        {
          account_id: 'santander-clp',
          currency: 'CLP',
          realized_clp: '0',
          translation_clp: '0',
          internal_transfer_clp: '0',
          total_clp: '0',
          is_active: true,
          rate_missing_days: '0',
          has_balance_in_window: true
        },
        {
          account_id: 'santander-corp-clp',
          currency: 'CLP',
          realized_clp: '0',
          translation_clp: '0',
          internal_transfer_clp: '0',
          total_clp: '0',
          is_active: true,
          rate_missing_days: '0',
          has_balance_in_window: false
        }
      ]
    })

    const result = await getBankFxPnlBreakdown({ year: 2026, month: 4 })

    expect(result.hasExposure).toBe(false)
    expect(result.isDegraded).toBe(false)
    expect(result.totalClp).toBe(0)
    expect(result.realizedClp).toBe(0)
    expect(result.translationClp).toBe(0)
    expect(result.internalTransferClp).toBe(0)
    expect(result.byAccount).toHaveLength(2)
    expect(result.byAccount.every(a => !a.hasExposure)).toBe(true)
  })

  it('aggregates realized + translation across accounts and flags exposure when a non-CLP account is active', async () => {
    queuedResults.push({
      rows: [
        {
          account_id: 'santander-clp',
          currency: 'CLP',
          realized_clp: '0',
          translation_clp: '0',
          internal_transfer_clp: '0',
          total_clp: '0',
          is_active: true,
          rate_missing_days: '0',
          has_balance_in_window: true
        },
        {
          account_id: 'wise-usd',
          currency: 'USD',
          realized_clp: '12000',
          translation_clp: '8500',
          internal_transfer_clp: '0',
          total_clp: '20500',
          is_active: true,
          rate_missing_days: '0',
          has_balance_in_window: true
        }
      ]
    })

    const result = await getBankFxPnlBreakdown({ year: 2026, month: 4 })

    expect(result.hasExposure).toBe(true)
    expect(result.isDegraded).toBe(false)
    expect(result.realizedClp).toBe(12000)
    expect(result.translationClp).toBe(8500)
    expect(result.totalClp).toBe(20500)

    const usdAccount = result.byAccount.find(a => a.accountId === 'wise-usd')

    expect(usdAccount?.hasExposure).toBe(true)
    expect(usdAccount?.translationClp).toBe(8500)
  })

  it('flags isDegraded=true when a non-CLP account had days with missing rate during the window', async () => {
    queuedResults.push({
      rows: [
        {
          account_id: 'wise-usd',
          currency: 'USD',
          realized_clp: '0',
          translation_clp: '0',
          internal_transfer_clp: '0',
          total_clp: '0',
          is_active: true,
          rate_missing_days: '3',
          has_balance_in_window: true
        }
      ]
    })

    const result = await getBankFxPnlBreakdown({ year: 2026, month: 4 })

    expect(result.hasExposure).toBe(true)
    expect(result.isDegraded).toBe(true)
  })

  it('rejects invalid periods', async () => {
    await expect(
      getBankFxPnlBreakdown({ year: 2026, month: 13 })
    ).rejects.toThrow(/year\/month/)

    await expect(
      getBankFxPnlBreakdown({ year: 2026, month: 0 })
    ).rejects.toThrow(/year\/month/)
  })
})
