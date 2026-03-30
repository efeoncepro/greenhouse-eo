import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/calendar/operational-calendar', () => ({
  DEFAULT_OPERATIONAL_CALENDAR_COUNTRY_CODE: 'CL',
  DEFAULT_OPERATIONAL_CALENDAR_TIMEZONE: 'America/Santiago',
  getLastBusinessDayOfMonth: vi.fn(() => '2026-03-31'),
  resolveOperationalCalendarContext: vi.fn(() => ({
    timezone: 'America/Santiago',
    countryCode: 'CL',
    closeWindowBusinessDays: 5
  }))
}))

vi.mock('@/lib/calendar/nager-date-holidays', () => ({
  fetchNagerDatePublicHolidays: vi.fn(async () => [
    { date: '2026-03-01', localName: 'Año Nuevo (test)', name: 'New Year' }
  ])
}))

import { getAdminOperationalCalendarOverview } from './get-admin-operational-calendar-overview'

describe('getAdminOperationalCalendarOverview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns events for a valid month key', async () => {
    const result = await getAdminOperationalCalendarOverview('2026-03')

    expect(result.monthKey).toBe('2026-03')
    expect(result.timezone).toBe('America/Santiago')
    expect(result.countryCode).toBe('CL')
    expect(result.holidaySource).toBe('nager')
    expect(result.holidaysCount).toBe(1)
    expect(result.events.length).toBeGreaterThanOrEqual(3) // 1 holiday + close window + deadline
  })

  it('includes holiday events with correct structure', async () => {
    const result = await getAdminOperationalCalendarOverview('2026-03')
    const holiday = result.events.find(e => e.id.startsWith('holiday-'))

    expect(holiday).toBeDefined()
    expect(holiday?.title).toBe('Año Nuevo (test)')
    expect(holiday?.allDay).toBe(true)
    expect(holiday?.extendedProps?.type).toBe('holiday')
  })

  it('includes payroll deadline event', async () => {
    const result = await getAdminOperationalCalendarOverview('2026-03')
    const deadline = result.events.find(e => e.id.startsWith('payroll-deadline-'))

    expect(deadline).toBeDefined()
    expect(deadline?.extendedProps?.type).toBe('deadline')
  })

  it('includes close window event', async () => {
    const result = await getAdminOperationalCalendarOverview('2026-03')
    const closeWindow = result.events.find(e => e.id.startsWith('close-window-'))

    expect(closeWindow).toBeDefined()
    expect(closeWindow?.extendedProps?.type).toBe('close_window')
  })

  it('falls back to current month for invalid key', async () => {
    const result = await getAdminOperationalCalendarOverview('invalid')
    const now = new Date()
    const expectedMonth = String(now.getMonth() + 1).padStart(2, '0')

    expect(result.monthKey).toContain(expectedMonth)
  })

  it('falls back to current month when key is null', async () => {
    const result = await getAdminOperationalCalendarOverview(null)

    expect(result.monthKey).toMatch(/^\d{4}-\d{2}$/)
    expect(result.events.length).toBeGreaterThan(0)
  })
})
