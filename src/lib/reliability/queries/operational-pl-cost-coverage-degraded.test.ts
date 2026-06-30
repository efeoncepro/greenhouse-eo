import { beforeEach, describe, expect, it, vi } from 'vitest'

const queryMock = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => queryMock(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

import { getOperationalPlCostCoverageDegradedSignal } from './operational-pl-cost-coverage-degraded'

const FLOOR = 202602

describe('getOperationalPlCostCoverageDegradedSignal (TASK-1200 — honest classification)', () => {
  beforeEach(() => {
    queryMock.mockReset()
  })

  it('sin períodos sospechosos → ok', async () => {
    queryMock.mockResolvedValueOnce([])

    const signal = await getOperationalPlCostCoverageDegradedSignal()

    expect(signal.signalId).toBe('finance.operational_pl.cost_coverage_degraded')
    expect(signal.moduleKey).toBe('finance')
    expect(signal.kind).toBe('data_quality')
    expect(signal.severity).toBe('ok')
    expect(signal.summary).toContain('no tiene períodos')
  })

  it('solo pending + unavailable (sin bug) → ok, NO error (estado real Jun2026 + pre-sistema)', async () => {
    queryMock.mockResolvedValueOnce([
      // pre-sistema → unavailable
      { period_year: 2025, period_month: 11, snapshot_count: 9, revenue_clp: '7772603', floor_key: FLOOR, payroll_entry_count: 0, labor_allocation_row_count: 0 },
      { period_year: 2026, period_month: 1, snapshot_count: 6, revenue_clp: '7654730', floor_key: FLOOR, payroll_entry_count: 0, labor_allocation_row_count: 0 },
      // payroll por correr → pending
      { period_year: 2026, period_month: 6, snapshot_count: 8, revenue_clp: '16340109', floor_key: FLOOR, payroll_entry_count: 0, labor_allocation_row_count: 0 }
    ])

    const signal = await getOperationalPlCostCoverageDegradedSignal()

    expect(signal.severity).toBe('ok')
    expect(signal.summary).toContain('pending')
    expect(signal.summary).toContain('unavailable')
    expect(signal.evidence.find(e => e.label === 'degraded_bug_periods')?.value).toBe('0')
    expect(signal.evidence.find(e => e.label === 'pending_periods')?.value).toContain('2026-06')
  })

  it('payroll existe pero asignación 0 → degraded → error', async () => {
    queryMock.mockResolvedValueOnce([
      { period_year: 2026, period_month: 4, snapshot_count: 3, revenue_clp: '6902000', floor_key: FLOOR, payroll_entry_count: 6, labor_allocation_row_count: 0 }
    ])

    const signal = await getOperationalPlCostCoverageDegradedSignal()

    expect(signal.severity).toBe('error')
    expect(signal.summary).toContain('2026-04')
    expect(signal.summary).toContain('bug')
    expect(signal.evidence.find(e => e.label === 'degraded_bug_periods')?.value).toContain('2026-04')
  })

  it('snapshot con cost=0 pero asignación presente → canonical, excluido del alarm', async () => {
    queryMock.mockResolvedValueOnce([
      { period_year: 2026, period_month: 2, snapshot_count: 1, revenue_clp: '9912190', floor_key: FLOOR, payroll_entry_count: 2, labor_allocation_row_count: 2 }
    ])

    const signal = await getOperationalPlCostCoverageDegradedSignal()

    expect(signal.severity).toBe('ok')
    expect(signal.evidence.find(e => e.label === 'degraded_bug_periods')?.value).toBe('0')
  })

  it('query falla → unknown', async () => {
    queryMock.mockRejectedValueOnce(new Error('schema drift'))

    const signal = await getOperationalPlCostCoverageDegradedSignal()

    expect(signal.severity).toBe('unknown')
    expect(signal.evidence.find(e => e.label === 'error')?.value).toContain('schema drift')
  })
})
