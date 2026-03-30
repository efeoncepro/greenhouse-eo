import 'server-only'

import {
  DEFAULT_OPERATIONAL_CALENDAR_COUNTRY_CODE,
  DEFAULT_OPERATIONAL_CALENDAR_TIMEZONE,
  getLastBusinessDayOfMonth,
  resolveOperationalCalendarContext
} from '@/lib/calendar/operational-calendar'
import { fetchNagerDatePublicHolidays } from '@/lib/calendar/nager-date-holidays'
import type { GreenhouseCalendarEvent } from '@/components/greenhouse/GreenhouseCalendar'

export interface AdminOperationalCalendarOverview {
  monthKey: string
  monthDateIso: string
  timezone: string
  countryCode: string
  holidaySource: 'nager' | 'empty-fallback'
  holidaysCount: number
  closeWindowBusinessDays: number
  lastBusinessDay: string
  events: GreenhouseCalendarEvent[]
}

const parseMonthKey = (monthKey?: string | null) => {
  const fallback = new Date()

  if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) {
    return {
      year: fallback.getFullYear(),
      month: fallback.getMonth() + 1
    }
  }

  const year = Number(monthKey.slice(0, 4))
  const month = Number(monthKey.slice(5, 7))

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return {
      year: fallback.getFullYear(),
      month: fallback.getMonth() + 1
    }
  }

  return { year, month }
}

const toMonthKey = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}`
const toDateKey = (year: number, month: number, day: number) => `${toMonthKey(year, month)}-${String(day).padStart(2, '0')}`

const isBusinessDay = (dateKey: string, holidayDates: Set<string>) => {
  const date = new Date(`${dateKey}T12:00:00Z`)
  const day = date.getUTCDay()

  return day !== 0 && day !== 6 && !holidayDates.has(dateKey)
}

const getCloseWindowEnd = (year: number, month: number, closeWindowBusinessDays: number, holidayDates: Set<string>) => {
  let day = 1
  let count = 0
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()

  while (day <= lastDay) {
    const dateKey = toDateKey(year, month, day)

    if (isBusinessDay(dateKey, holidayDates)) {
      count++

      if (count === closeWindowBusinessDays) {
        return dateKey
      }
    }

    day++
  }

  return toDateKey(year, month, lastDay)
}

export const getAdminOperationalCalendarOverview = async (monthKey?: string | null): Promise<AdminOperationalCalendarOverview> => {
  const { year, month } = parseMonthKey(monthKey)
  const resolvedMonthKey = toMonthKey(year, month)
  const context = resolveOperationalCalendarContext()

  let holidayDates = new Set<string>()
  let holidayEvents: GreenhouseCalendarEvent[] = []
  let holidaySource: AdminOperationalCalendarOverview['holidaySource'] = 'nager'

  try {
    const holidays = await fetchNagerDatePublicHolidays(year, context.countryCode)

    holidayDates = new Set(holidays.map(holiday => holiday.date))
    holidayEvents = holidays.map(holiday => ({
      id: `holiday-${holiday.date}`,
      title: holiday.localName || holiday.name,
      start: holiday.date,
      allDay: true,
      color: '#16a34a',
      extendedProps: {
        type: 'holiday'
      }
    }))
  } catch {
    holidaySource = 'empty-fallback'
  }

  const lastBusinessDay = getLastBusinessDayOfMonth(year, month, {
    timezone: context.timezone,
    countryCode: context.countryCode,
    holidayDates
  })

  const closeWindowEnd = getCloseWindowEnd(year, month, context.closeWindowBusinessDays, holidayDates)

  const events: GreenhouseCalendarEvent[] = [
    ...holidayEvents,
    {
      id: `close-window-${resolvedMonthKey}`,
      title: `Ventana de cierre (${context.closeWindowBusinessDays} días hábiles)`,
      start: toDateKey(year, month, 1),
      end: closeWindowEnd,
      allDay: true,
      color: '#0ea5e9',
      extendedProps: { type: 'close_window' }
    },
    {
      id: `payroll-deadline-${resolvedMonthKey}`,
      title: 'Último día hábil del mes operativo',
      start: lastBusinessDay,
      allDay: true,
      color: '#f59e0b',
      extendedProps: { type: 'deadline' }
    }
  ]

  return {
    monthKey: resolvedMonthKey,
    monthDateIso: `${resolvedMonthKey}-01`,
    timezone: context.timezone || DEFAULT_OPERATIONAL_CALENDAR_TIMEZONE,
    countryCode: context.countryCode || DEFAULT_OPERATIONAL_CALENDAR_COUNTRY_CODE,
    holidaySource,
    holidaysCount: holidayEvents.length,
    closeWindowBusinessDays: context.closeWindowBusinessDays,
    lastBusinessDay,
    events
  }
}
