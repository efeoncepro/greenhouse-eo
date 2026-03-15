import { describe, expect, it } from 'vitest'

import { countWeekdays } from './fetch-attendance-for-period'

describe('countWeekdays', () => {
  it('counts 5 weekdays for a full Mon-Fri week', () => {
    // 2026-03-16 is Monday, 2026-03-20 is Friday
    expect(countWeekdays('2026-03-16', '2026-03-20')).toBe(5)
  })

  it('counts 5 weekdays for a full calendar week (Mon-Sun)', () => {
    // 2026-03-16 Mon through 2026-03-22 Sun
    expect(countWeekdays('2026-03-16', '2026-03-22')).toBe(5)
  })

  it('returns 0 for a weekend-only range', () => {
    // 2026-03-21 Sat, 2026-03-22 Sun
    expect(countWeekdays('2026-03-21', '2026-03-22')).toBe(0)
  })

  it('returns 1 for a single weekday', () => {
    // 2026-03-18 is Wednesday
    expect(countWeekdays('2026-03-18', '2026-03-18')).toBe(1)
  })

  it('returns 0 for a single Saturday', () => {
    expect(countWeekdays('2026-03-21', '2026-03-21')).toBe(0)
  })

  it('returns 0 for a single Sunday', () => {
    expect(countWeekdays('2026-03-22', '2026-03-22')).toBe(0)
  })

  it('counts correctly across a month boundary', () => {
    // 2026-02-27 Fri → 2026-03-03 Tue = Fri, Mon, Tue = 3 weekdays
    expect(countWeekdays('2026-02-27', '2026-03-03')).toBe(3)
  })

  it('counts 22 weekdays for a typical month (March 2026)', () => {
    // March 2026: 1 Sun, 2 Mon ... 31 Tue
    // Weekdays: 22 (31 days - 4 Sat - 5 Sun)
    expect(countWeekdays('2026-03-01', '2026-03-31')).toBe(22)
  })

  it('counts 2 full weeks correctly', () => {
    // 2026-03-16 Mon → 2026-03-27 Fri = 10 weekdays
    expect(countWeekdays('2026-03-16', '2026-03-27')).toBe(10)
  })

  it('returns 0 for inverted range', () => {
    // End before start
    expect(countWeekdays('2026-03-20', '2026-03-16')).toBe(0)
  })
})
