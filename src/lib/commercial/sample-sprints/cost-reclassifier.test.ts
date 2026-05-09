import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('@/lib/db', () => ({
  query: vi.fn()
}))

import { query } from '@/lib/db'

import {
  getClientNetMarginExcludingGtm,
  getGtmInvestmentForPeriod,
  getGtmInvestmentRatio
} from './cost-reclassifier'

const mockedQuery = query as unknown as ReturnType<typeof vi.fn>

beforeEach(() => {
  mockedQuery.mockReset()
})

describe('Sample Sprint cost reclassifier', () => {
  it('aggregates GTM investment by client for a period', async () => {
    mockedQuery.mockResolvedValueOnce([
      { client_id: 'client-sky', gtm_investment_clp: '1200000.4' },
      { client_id: 'client-moto', gtm_investment_clp: '300000.2' }
    ])

    const result = await getGtmInvestmentForPeriod({ year: 2026, month: 5 })

    expect(result).toEqual({
      year: 2026,
      month: 5,
      totalGtmInvestmentClp: 1500000,
      byClient: [
        { clientId: 'client-sky', gtmInvestmentClp: 1200000 },
        { clientId: 'client-moto', gtmInvestmentClp: 300000 }
      ]
    })
    expect(String(mockedQuery.mock.calls[0][0])).toContain('greenhouse_serving.gtm_investment_pnl')
  })

  it('passes optional client filter through the canonical view query', async () => {
    mockedQuery.mockResolvedValueOnce([
      { client_id: 'client-sky', gtm_investment_clp: '250000' }
    ])

    const result = await getGtmInvestmentForPeriod({ year: 2026, month: 5, clientId: ' client-sky ' })

    expect(result.totalGtmInvestmentClp).toBe(250000)
    expect(mockedQuery.mock.calls[0][1]).toEqual([2026, 5, 'client-sky'])
  })

  it('returns zero GTM investment when the view has no no-cost approved rows', async () => {
    mockedQuery.mockResolvedValueOnce([])

    await expect(getGtmInvestmentForPeriod({ year: 2026, month: 5 })).resolves.toEqual({
      year: 2026,
      month: 5,
      totalGtmInvestmentClp: 0,
      byClient: []
    })
  })

  it('calculates GTM investment ratio from latest operational P&L revenue', async () => {
    mockedQuery
      .mockResolvedValueOnce([{ client_id: 'client-sky', gtm_investment_clp: '100000' }])
      .mockResolvedValueOnce([{ revenue_clp: '2000000' }])

    await expect(getGtmInvestmentRatio({ year: 2026, month: 5 })).resolves.toBe(0.05)
    expect(String(mockedQuery.mock.calls[1][0])).toContain('greenhouse_serving.operational_pl_snapshots')
    expect(String(mockedQuery.mock.calls[1][0])).toContain('greenhouse_finance.client_economics')
  })

  it('returns zero ratio when period revenue is zero or missing', async () => {
    mockedQuery
      .mockResolvedValueOnce([{ client_id: 'client-sky', gtm_investment_clp: '100000' }])
      .mockResolvedValueOnce([{ revenue_clp: '0' }])

    await expect(getGtmInvestmentRatio({ year: 2026, month: 5 })).resolves.toBe(0)
  })

  it('adds back GTM investment to client net margin without mutating base economics', async () => {
    mockedQuery.mockResolvedValueOnce([{ amount_clp: '-650000.2' }])

    const result = await getClientNetMarginExcludingGtm(' client-sky ', { year: 2026, month: 5 })

    expect(result).toBe(-650000)
    expect(String(mockedQuery.mock.calls[0][0])).toContain('greenhouse_finance.client_economics')
    expect(String(mockedQuery.mock.calls[0][0])).toContain('greenhouse_serving.gtm_investment_pnl')
    expect(mockedQuery.mock.calls[0][1]).toEqual(['client-sky', 2026, 5])
  })

  it('rejects invalid periods and empty clients before querying', async () => {
    await expect(getGtmInvestmentForPeriod({ year: 2026, month: 13 })).rejects.toBeInstanceOf(RangeError)
    await expect(getGtmInvestmentRatio({ year: 1999, month: 5 })).rejects.toBeInstanceOf(RangeError)
    await expect(getClientNetMarginExcludingGtm(' ', { year: 2026, month: 5 })).rejects.toBeInstanceOf(RangeError)

    expect(mockedQuery).not.toHaveBeenCalled()
  })
})
