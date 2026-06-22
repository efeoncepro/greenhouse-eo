import { beforeEach, describe, expect, it, vi } from 'vitest'

const queryMock = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => queryMock(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

import { getOperationalPlCostCoverageDegradedSignal } from './operational-pl-cost-coverage-degraded'

describe('getOperationalPlCostCoverageDegradedSignal', () => {
  beforeEach(() => {
    queryMock.mockReset()
  })

  it('returns ok when no periods have missing upstream cost coverage', async () => {
    queryMock.mockResolvedValueOnce([
      {
        period_count: 0,
        snapshot_count: 0,
        revenue_clp: 0,
        periods: ''
      }
    ])

    const signal = await getOperationalPlCostCoverageDegradedSignal()

    expect(signal.signalId).toBe('finance.operational_pl.cost_coverage_degraded')
    expect(signal.moduleKey).toBe('finance')
    expect(signal.kind).toBe('data_quality')
    expect(signal.severity).toBe('ok')
    expect(signal.summary).toContain('no tiene períodos')
  })

  it('returns error when P&L has revenue and zero cost without upstream attribution', async () => {
    queryMock.mockResolvedValueOnce([
      {
        period_count: 1,
        snapshot_count: 3,
        revenue_clp: '20706000',
        periods: '2026-06'
      }
    ])

    const signal = await getOperationalPlCostCoverageDegradedSignal()

    expect(signal.severity).toBe('error')
    expect(signal.summary).toContain('2026-06')
    expect(signal.summary).toContain('No usar ese margen como canónico')
    expect(signal.evidence.find(e => e.label === 'period_count')?.value).toBe('1')
  })

  it('returns unknown when the query fails', async () => {
    queryMock.mockRejectedValueOnce(new Error('schema drift'))

    const signal = await getOperationalPlCostCoverageDegradedSignal()

    expect(signal.severity).toBe('unknown')
    expect(signal.evidence.find(e => e.label === 'error')?.value).toContain('schema drift')
  })
})
