import { describe, expect, it } from 'vitest'

import { DEFAULT_OPERATIONAL_CALENDAR_TIMEZONE } from '@/lib/calendar/operational-calendar'

import { resolveContractorPaymentDueDate } from './due-date'

const tz = { timezone: DEFAULT_OPERATIONAL_CALENDAR_TIMEZONE }

describe('resolveContractorPaymentDueDate (TASK-978)', () => {
  it('derives close-of-operational-month + 5 business days (mid-month reference)', () => {
    // 2026-05-20 is past the close window → operational month = May 2026.
    // Last business day of May 2026 = 2026-05-29 (Fri; 30/31 are weekend).
    // +5 business days → Mon 06-01, Tue 02, Wed 03, Thu 04, Fri 05.
    expect(resolveContractorPaymentDueDate({ referenceDate: '2026-05-20', calendarOptions: tz })).toBe(
      '2026-06-05'
    )
  })

  it('rolls back to the previous operational month inside the close window', () => {
    // 2026-06-02 is within the first 5 business days → operational month = May 2026.
    expect(resolveContractorPaymentDueDate({ referenceDate: '2026-06-02', calendarOptions: tz })).toBe(
      '2026-06-05'
    )
  })

  it('honors a custom business-day window', () => {
    // Last business day of May 2026 = 2026-05-29 (Fri). +1 business day → Mon 06-01.
    expect(
      resolveContractorPaymentDueDate({ referenceDate: '2026-05-20', businessDays: 1, calendarOptions: tz })
    ).toBe('2026-06-01')
  })

  it('skips holidays in the close window', () => {
    // Force 2026-05-29 as a holiday → last business day of May = 2026-05-28 (Thu).
    // +5 business days skipping 05-29 holiday + weekend → Mon 06-01 .. Fri 06-05.
    expect(
      resolveContractorPaymentDueDate({
        referenceDate: '2026-05-20',
        calendarOptions: { ...tz, holidayDates: ['2026-05-29'] }
      })
    ).toBe('2026-06-05')
  })
})
