import { beforeEach, describe, expect, it, vi } from 'vitest'

// TASK-1200 — readiness de cobertura laboral por período.

const mockQuery = vi.fn()
const mockCapture = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => mockQuery(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => mockCapture(...args)
}))

import {
  classifyLaborAllocationCoverage,
  isLaborAllocationCoverageCanonical,
  resolveLaborAllocationReadiness
} from './labor-allocation-readiness'

describe('classifyLaborAllocationCoverage (TASK-1200)', () => {
  const floor = 202602 // primer período con payroll = Feb 2026

  it('asignación presente → canonical (verificado: 2026-02, 2026-05)', () => {
    expect(
      classifyLaborAllocationCoverage({
        periodKey: 202605,
        payrollSystemFloorKey: floor,
        payrollEntryCount: 5,
        laborAllocationRowCount: 3
      })
    ).toBe('canonical')
  })

  it('payroll existe pero asignación 0 → degraded (bug real)', () => {
    expect(
      classifyLaborAllocationCoverage({
        periodKey: 202604,
        payrollSystemFloorKey: floor,
        payrollEntryCount: 6,
        laborAllocationRowCount: 0
      })
    ).toBe('degraded')
  })

  it('período < floor del sistema de payroll → unavailable (pre-system: 2025-11/12, 2026-01)', () => {
    for (const periodKey of [202511, 202512, 202601]) {
      expect(
        classifyLaborAllocationCoverage({
          periodKey,
          payrollSystemFloorKey: floor,
          payrollEntryCount: 0,
          laborAllocationRowCount: 0
        })
      ).toBe('unavailable')
    }
  })

  it('período >= floor sin payroll aún → pending (2026-06: payroll corre la próxima semana)', () => {
    expect(
      classifyLaborAllocationCoverage({
        periodKey: 202606,
        payrollSystemFloorKey: floor,
        payrollEntryCount: 0,
        laborAllocationRowCount: 0
      })
    ).toBe('pending')
  })

  it('sin floor (ningún payroll en el sistema) → pending', () => {
    expect(
      classifyLaborAllocationCoverage({
        periodKey: 202606,
        payrollSystemFloorKey: null,
        payrollEntryCount: 0,
        laborAllocationRowCount: 0
      })
    ).toBe('pending')
  })
})

describe('isLaborAllocationCoverageCanonical', () => {
  it('solo canonical es canónico', () => {
    const base = {
      periodYear: 2026,
      periodMonth: 6,
      payrollPeriodStatus: null,
      payrollEntryCount: 0,
      laborAllocationRowCount: 0,
      revenueClp: 0,
      totalCostClp: 0,
      payrollSystemFloorKey: 202602,
      reason: ''
    }

    expect(isLaborAllocationCoverageCanonical({ ...base, status: 'canonical' })).toBe(true)

    for (const status of ['pending', 'unavailable', 'degraded'] as const) {
      expect(isLaborAllocationCoverageCanonical({ ...base, status })).toBe(false)
    }
  })
})

describe('resolveLaborAllocationReadiness', () => {
  beforeEach(() => {
    mockQuery.mockReset()
    mockCapture.mockReset()
  })

  it('2026-06 sin payroll → pending + margen no canónico', async () => {
    mockQuery.mockResolvedValueOnce([
      {
        floor_key: 202602,
        payroll_period_status: null,
        payroll_entry_count: 0,
        labor_allocation_row_count: 0,
        revenue_clp: '16340109',
        total_cost_clp: 0
      }
    ])

    const r = await resolveLaborAllocationReadiness(2026, 6)

    expect(r.status).toBe('pending')
    expect(isLaborAllocationCoverageCanonical(r)).toBe(false)
    expect(r.revenueClp).toBe(16340109)
  })

  it('2025-11 pre-system → unavailable', async () => {
    mockQuery.mockResolvedValueOnce([
      {
        floor_key: 202602,
        payroll_period_status: null,
        payroll_entry_count: 0,
        labor_allocation_row_count: 0,
        revenue_clp: '7772603',
        total_cost_clp: 0
      }
    ])

    const r = await resolveLaborAllocationReadiness(2025, 11)

    expect(r.status).toBe('unavailable')
    expect(r.reason).toContain('2026-02')
  })

  it('error PG → pending + captureWithDomain finance (degradación honesta, no canónico)', async () => {
    mockQuery.mockRejectedValueOnce(new Error('PG down'))

    const r = await resolveLaborAllocationReadiness(2026, 5)

    expect(r.status).toBe('pending')
    expect(isLaborAllocationCoverageCanonical(r)).toBe(false)
    expect(mockCapture).toHaveBeenCalledWith(
      expect.any(Error),
      'finance',
      expect.objectContaining({ tags: expect.objectContaining({ source: 'labor_allocation_readiness' }) })
    )
  })
})
