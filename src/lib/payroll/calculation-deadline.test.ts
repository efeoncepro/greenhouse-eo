import { describe, expect, it } from 'vitest'

import type { PayrollPeriod } from '@/types/payroll'

import { resolvePayrollCalculationDeadline } from './calculation-deadline'

const buildPeriod = (overrides: Partial<PayrollPeriod> = {}): PayrollPeriod => ({
  periodId: '2026-05',
  year: 2026,
  month: 5,
  status: 'draft',
  calculatedAt: null,
  calculatedBy: null,
  approvedAt: null,
  approvedBy: null,
  exportedAt: null,
  ufValue: 40593.77,
  taxTableVersion: 'gael-2026-05',
  notes: null,
  createdAt: null,
  ...overrides
})

describe('resolvePayrollCalculationDeadline', () => {
  it('uses the last business day, not the calendar month-end, as operational deadline', () => {
    const deadline = resolvePayrollCalculationDeadline(buildPeriod(), '2026-05-31T15:00:00.000Z')

    expect(deadline.lastBusinessDay).toBe('2026-05-29')
    expect(deadline.state).toBe('overdue_allowed')
    expect(deadline.isOverdue).toBe(true)
    expect(deadline.blocksCalculation).toBe(false)
  })

  it('marks the exact last business day as due today', () => {
    const deadline = resolvePayrollCalculationDeadline(buildPeriod(), '2026-05-29T15:00:00.000Z')

    expect(deadline.state).toBe('due_today')
    expect(deadline.isDue).toBe(true)
    expect(deadline.isOverdue).toBe(false)
  })

  it('keeps calculated-late state separate from blocking semantics', () => {
    const deadline = resolvePayrollCalculationDeadline(
      buildPeriod({ status: 'calculated', calculatedAt: '2026-05-31T15:00:00.000Z' }),
      '2026-06-01T15:00:00.000Z'
    )

    expect(deadline.state).toBe('calculated_late')
    expect(deadline.calculatedOnTime).toBe(false)
    expect(deadline.blocksCalculation).toBe(false)
  })
})
