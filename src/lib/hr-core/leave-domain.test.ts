import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockLoadNagerDateHolidayDateSet = vi.fn()

vi.mock('@/lib/calendar/nager-date-holidays', () => ({
  loadNagerDateHolidayDateSet: (...args: unknown[]) => mockLoadNagerDateHolidayDateSet(...args)
}))

const {
  calculateProgressiveExtraDays,
  classifyLeavePayrollImpact,
  computeLeaveDayBreakdown
} = await import('@/lib/hr-core/leave-domain')

describe('leave-domain', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('computes working-day breakdown excluding weekends and holidays', async () => {
    mockLoadNagerDateHolidayDateSet.mockResolvedValue(new Set(['2026-05-01']))

    const result = await computeLeaveDayBreakdown({
      startDate: '2026-04-30',
      endDate: '2026-05-04',
      countryCode: 'CL'
    })

    expect(result.totalDays).toBe(2)
    expect(result.dateKeys).toEqual(['2026-04-30', '2026-05-04'])
    expect(result.daysByYear.get(2026)).toBe(2)
    expect(result.holidaySource).toBe('nager')
  })

  it('falls back cleanly when holiday provider is unavailable', async () => {
    mockLoadNagerDateHolidayDateSet.mockRejectedValue(new Error('network'))

    const result = await computeLeaveDayBreakdown({
      startDate: '2027-05-04',
      endDate: '2027-05-05',
      countryCode: 'CL'
    })

    expect(result.totalDays).toBe(2)
    expect(result.holidaySource).toBe('empty-fallback')
  })

  it('calculates progressive extra days from prior years and hire date', () => {
    expect(
      calculateProgressiveExtraDays({
        priorWorkYears: 4,
        hireDate: '2015-01-01',
        asOfDate: '2026-01-01',
        progressiveBaseYears: 10,
        progressiveIntervalYears: 3,
        progressiveMaxExtraDays: 10
      })
    ).toBe(1)
  })

  it('classifies payroll impact according to period lifecycle', () => {
    expect(classifyLeavePayrollImpact([]).mode).toBe('none')
    expect(
      classifyLeavePayrollImpact([
        { periodId: '2026-03', year: 2026, month: 3, status: 'approved' }
      ]).mode
    ).toBe('recalculate_recommended')
    expect(
      classifyLeavePayrollImpact([
        { periodId: '2026-03', year: 2026, month: 3, status: 'exported' }
      ]).mode
    ).toBe('deferred_adjustment_required')
  })
})
