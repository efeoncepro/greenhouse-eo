import { describe, expect, it } from 'vitest'

import type { PayrollPeriod } from '@/types/payroll'

import { getNthBusinessDayOfMonth } from '@/lib/calendar/operational-calendar'

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
  it('anchors the deadline on the Nth business day of the month AFTER the period (Efeonce close window)', () => {
    // Período mayo → paga dentro de los primeros 5 días hábiles de junio.
    const juneDeadline = getNthBusinessDayOfMonth(2026, 6, 5)
    const deadline = resolvePayrollCalculationDeadline(buildPeriod(), '2026-05-31T15:00:00.000Z')

    expect(deadline.deadlineDate).toBe(juneDeadline)
    // El 31 de mayo estamos ANTES del deadline (primeros días hábiles de junio) → pendiente, no overdue.
    expect(deadline.state).toBe('pending')
    expect(deadline.isOverdue).toBe(false)
    expect(deadline.blocksCalculation).toBe(false)
  })

  it('marks the deadline day itself as due today', () => {
    const juneDeadline = getNthBusinessDayOfMonth(2026, 6, 5)
    const deadline = resolvePayrollCalculationDeadline(buildPeriod(), `${juneDeadline}T15:00:00.000Z`)

    expect(deadline.state).toBe('due_today')
    expect(deadline.isDue).toBe(true)
    expect(deadline.isDeadlineDay).toBe(true)
    expect(deadline.isOverdue).toBe(false)
  })

  it('marks the period overdue once the close window of the following month passed', () => {
    const deadline = resolvePayrollCalculationDeadline(buildPeriod(), '2026-06-20T15:00:00.000Z')

    expect(deadline.state).toBe('overdue_allowed')
    expect(deadline.isOverdue).toBe(true)
    expect(deadline.blocksCalculation).toBe(false)
  })

  it('treats calculation within the close window as on time', () => {
    // Período junio, calculado el 3 de julio (dentro de los primeros días hábiles de julio).
    const deadline = resolvePayrollCalculationDeadline(
      buildPeriod({ periodId: '2026-06', month: 6, status: 'calculated', calculatedAt: '2026-07-03T13:00:00.000Z' }),
      '2026-07-03T16:00:00.000Z'
    )

    expect(deadline.calculatedOnTime).toBe(true)
    expect(deadline.state).toBe('calculated_on_time')
  })

  it('keeps calculated-late state separate from blocking semantics', () => {
    // Período junio, calculado el 20 de julio (después del close window) → tarde, pero no bloqueado.
    const deadline = resolvePayrollCalculationDeadline(
      buildPeriod({ periodId: '2026-06', month: 6, status: 'calculated', calculatedAt: '2026-07-20T15:00:00.000Z' }),
      '2026-07-21T15:00:00.000Z'
    )

    expect(deadline.state).toBe('calculated_late')
    expect(deadline.calculatedOnTime).toBe(false)
    expect(deadline.blocksCalculation).toBe(false)
  })

  it('regression ISSUE-116: June period is on-track (not overdue) on the 4th business day of July', () => {
    // El operador pagando la nómina de junio el 2026-07-06 (4.º día hábil) está en plazo.
    const deadline = resolvePayrollCalculationDeadline(
      buildPeriod({ periodId: '2026-06', month: 6 }),
      '2026-07-06T15:00:00.000Z'
    )

    expect(deadline.isOverdue).toBe(false)
    expect(deadline.state).toBe('pending')
  })
})
