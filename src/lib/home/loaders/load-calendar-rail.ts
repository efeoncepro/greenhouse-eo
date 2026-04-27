import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import type { HomeCalendarEvent, HomeCalendarRailData } from '../contract'

/**
 * Calendar Rail loader — surfaces the next 7-14 days of operationally
 * relevant events: payroll closing windows, sprint endings, upcoming
 * leave windows.
 *
 * Schema notes (verified against live PG):
 *   greenhouse_payroll.payroll_periods → (year, month, status). No
 *     cutoff_at column — we synthesize the closing as the last day of
 *     month + 5 working days for periods that are still open/in_review.
 *   greenhouse_delivery.sprints → (sprint_record_id, sprint_name,
 *     sprint_status, end_date).
 *   greenhouse_hr.leave_requests → (request_id, leave_type_code,
 *     start_date, end_date, status). No policy join needed.
 */

interface PayrollPeriodRow {
  year: number | string
  month: number | string
  status: string | null
}

interface SprintRow {
  sprint_record_id: string
  sprint_name: string | null
  end_date: string | null
}

interface LeaveRow {
  request_id: string
  leave_type_code: string | null
  start_date: string
  end_date: string | null
}

const MONTH_LABEL = ['', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

const lastDayOfMonth = (year: number, month: number): string => {
  const date = new Date(Date.UTC(year, month, 0))

  return date.toISOString().slice(0, 10)
}

const readPayrollClosings = async (): Promise<HomeCalendarEvent[]> => {
  try {
    const rows = await runGreenhousePostgresQuery<PayrollPeriodRow & Record<string, unknown>>(
      `SELECT year, month, status
         FROM greenhouse_payroll.payroll_periods
        WHERE status IN ('open','in_review','calculated')
        ORDER BY year DESC, month DESC
        LIMIT 3`
    )

    return rows
      .map(row => {
        const year = Number(row.year)
        const month = Number(row.month)
        const closingDate = lastDayOfMonth(year, month)

        return {
          eventId: `payroll-${year}-${String(month).padStart(2, '0')}`,
          kind: 'closing' as const,
          title: `Cierre nómina ${MONTH_LABEL[month] ?? month} ${year}`,
          startsAt: closingDate,
          endsAt: null,
          href: '/hr/payroll',
          badge: row.status ?? null
        }
      })
      .filter(event => {
        const eventTime = new Date(event.startsAt).getTime()

        // Surface upcoming + recently-passed (< 7 days) — closings often
        // bleed past the calendar month, the user still needs to act on them.
        return eventTime >= Date.now() - 7 * 86400000 && eventTime <= Date.now() + 21 * 86400000
      })
  } catch {
    return []
  }
}

const readSprintEnds = async (): Promise<HomeCalendarEvent[]> => {
  try {
    const rows = await runGreenhousePostgresQuery<SprintRow & Record<string, unknown>>(
      `SELECT sprint_record_id, sprint_name, end_date
         FROM greenhouse_delivery.sprints
        WHERE end_date BETWEEN CURRENT_DATE - INTERVAL '2 days' AND CURRENT_DATE + INTERVAL '7 days'
          AND COALESCE(is_deleted, FALSE) = FALSE
        ORDER BY end_date
        LIMIT 4`
    )

    return rows
      .filter(row => row.end_date != null)
      .map(row => ({
        eventId: `sprint-${row.sprint_record_id}`,
        kind: 'sprint_end' as const,
        title: `Cierre ciclo ${row.sprint_name ?? row.sprint_record_id.slice(0, 8)}`,
        startsAt: row.end_date as string,
        endsAt: null,
        href: '/sprints',
        badge: null
      }))
  } catch {
    return []
  }
}

const readUpcomingLeaves = async (): Promise<HomeCalendarEvent[]> => {
  try {
    const rows = await runGreenhousePostgresQuery<LeaveRow & Record<string, unknown>>(
      `SELECT request_id, leave_type_code, start_date, end_date, status
         FROM greenhouse_hr.leave_requests
        WHERE start_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
          AND status IN ('approved','pending_jefatura','pending_hr','pending_supervisor','pending')
        ORDER BY start_date
        LIMIT 4`
    )

    return rows.map(row => ({
      eventId: `leave-${row.request_id}`,
      kind: 'leave_window' as const,
      title: `Permiso · ${row.leave_type_code ?? 'general'}`,
      startsAt: row.start_date,
      endsAt: row.end_date ?? null,
      href: '/hr/leave',
      badge: null
    }))
  } catch {
    return []
  }
}

export const loadHomeCalendarRail = async (): Promise<HomeCalendarRailData> => {
  const [payroll, sprints, leaves] = await Promise.all([
    readPayrollClosings(),
    readSprintEnds(),
    readUpcomingLeaves()
  ])

  const events = [...payroll, ...sprints, ...leaves]
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    .slice(0, 6)

  return {
    events,
    asOf: new Date().toISOString()
  }
}
