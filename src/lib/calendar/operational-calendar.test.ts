import { describe, expect, it } from 'vitest'

import {
  countBusinessDays,
  DEFAULT_OPERATIONAL_CALENDAR_TIMEZONE,
  getLastBusinessDayOfMonth,
  getOperationalDateKey,
  getOperationalPayrollMonth,
  isLastBusinessDayOfMonth,
  isWithinPayrollCloseWindow,
  resolveOperationalCalendarContext
} from './operational-calendar'

describe('operational-calendar', () => {
  it('resolves context with tenant precedence and merged holiday dates', () => {
    const context = resolveOperationalCalendarContext(
      {
        timezone: 'Europe/Madrid',
        countryCode: 'ES',
        holidayCalendarCode: 'tenant-calendar',
        holidayDates: ['2026-03-18'],
        closeWindowBusinessDays: 7
      },
      {
        timezone: 'America/Bogota',
        countryCode: 'CO',
        holidayCalendarCode: 'policy-calendar',
        holidayDates: ['2026-03-19'],
        closeWindowBusinessDays: 4
      },
      {
        timezone: 'America/Santiago',
        countryCode: 'CL',
        holidayCalendarCode: 'fallback-calendar',
        holidayDates: ['2026-03-20'],
        closeWindowBusinessDays: 5
      }
    )

    expect(context.timezone).toBe('Europe/Madrid')
    expect(context.countryCode).toBe('ES')
    expect(context.holidayCalendarCode).toBe('tenant-calendar')
    expect(context.closeWindowBusinessDays).toBe(7)
    expect([...context.holidayDates].sort()).toEqual(['2026-03-18', '2026-03-19', '2026-03-20'])
  })

  it('counts business days inclusively and skips holidays', () => {
    const count = countBusinessDays('2026-03-02', '2026-03-06', {
      timezone: DEFAULT_OPERATIONAL_CALENDAR_TIMEZONE,
      holidayDates: ['2026-03-04']
    })

    expect(count).toBe(4)
  })

  it('treats the first five business days of a month as close window', () => {
    expect(isWithinPayrollCloseWindow('2026-04-07', 5, {
      timezone: DEFAULT_OPERATIONAL_CALENDAR_TIMEZONE
    })).toBe(true)

    expect(isWithinPayrollCloseWindow('2026-04-08', 5, {
      timezone: DEFAULT_OPERATIONAL_CALENDAR_TIMEZONE
    })).toBe(false)
  })

  it('rolls the operational month back to the previous month during the close window', () => {
    const resolution = getOperationalPayrollMonth('2026-01-02', {
      timezone: DEFAULT_OPERATIONAL_CALENDAR_TIMEZONE
    })

    expect(resolution.calendarMonthKey).toBe('2026-01')
    expect(resolution.operationalMonthKey).toBe('2025-12')
    expect(resolution.inCloseWindow).toBe(true)
  })

  it('resolves a Date input in America/Santiago instead of UTC around DST-sensitive dates', () => {
    const referenceDate = new Date('2026-04-08T02:00:00.000Z')

    const resolution = getOperationalPayrollMonth(referenceDate, {
      timezone: DEFAULT_OPERATIONAL_CALENDAR_TIMEZONE
    })

    expect(resolution.calendarMonthKey).toBe('2026-04')
    expect(resolution.operationalMonthKey).toBe('2026-03')
    expect(resolution.inCloseWindow).toBe(true)
    expect(resolution.businessDaysElapsed).toBe(5)
  })

  it('resolves the last business day of a month skipping weekends and local holidays', () => {
    const lastBusinessDay = getLastBusinessDayOfMonth(2026, 5, {
      timezone: DEFAULT_OPERATIONAL_CALENDAR_TIMEZONE,
      holidayDates: ['2026-05-29']
    })

    expect(lastBusinessDay).toBe('2026-05-28')
  })

  it('detects when a date is the last business day of the month', () => {
    expect(isLastBusinessDayOfMonth('2026-03-31', {
      timezone: DEFAULT_OPERATIONAL_CALENDAR_TIMEZONE
    })).toBe(true)

    expect(isLastBusinessDayOfMonth('2026-03-30', {
      timezone: DEFAULT_OPERATIONAL_CALENDAR_TIMEZONE
    })).toBe(false)
  })

  it('returns a timezone-aware date key for operational comparisons', () => {
    const dateKey = getOperationalDateKey(new Date('2026-04-01T02:30:00.000Z'), {
      timezone: DEFAULT_OPERATIONAL_CALENDAR_TIMEZONE
    })

    expect(dateKey).toBe('2026-03-31')
  })
})
