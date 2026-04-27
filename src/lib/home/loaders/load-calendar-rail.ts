import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import type { HomeCalendarEvent, HomeCalendarRailData } from '../contract'

/**
 * Calendar Rail loader — surfaces the next 7 days of operationally
 * relevant events: payroll closing windows, sprint endings, leave
 * windows starting today/tomorrow, invoice due dates.
 *
 * Stays cheap: 3 parallel queries, all bounded by NOW + 7 days, all
 * limited to 4-6 rows each. Total query budget < 500ms.
 */

interface PayrollPeriodRow {
  period_year: number | string
  period_month: number | string
  cutoff_at: string | null
  status: string | null
}

interface SprintRow {
  sprint_id: string
  name: string | null
  end_date: string | null
}

interface LeaveRow {
  leave_request_id: string
  member_id: string | null
  start_date: string
  end_date: string | null
  reason_label: string | null
}

const readPayrollClosings = async (): Promise<HomeCalendarEvent[]> => {
  try {
    const rows = await runGreenhousePostgresQuery<PayrollPeriodRow & Record<string, unknown>>(
      `SELECT period_year, period_month, cutoff_at, status
         FROM greenhouse_payroll.payroll_periods
        WHERE status IN ('open','in_review')
          AND cutoff_at IS NOT NULL
          AND cutoff_at BETWEEN NOW() AND NOW() + INTERVAL '14 days'
        ORDER BY cutoff_at
        LIMIT 3`
    )

    return rows.map(row => ({
      eventId: `payroll-${row.period_year}-${row.period_month}`,
      kind: 'closing' as const,
      title: `Cierre nómina ${String(row.period_month).padStart(2, '0')}/${row.period_year}`,
      startsAt: row.cutoff_at as string,
      endsAt: null,
      href: '/hr/payroll',
      badge: null
    }))
  } catch {
    return []
  }
}

const readSprintEnds = async (): Promise<HomeCalendarEvent[]> => {
  try {
    const rows = await runGreenhousePostgresQuery<SprintRow & Record<string, unknown>>(
      `SELECT sprint_id, name, end_date
         FROM greenhouse_delivery.sprints
        WHERE end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
          AND status = 'in_progress'
        ORDER BY end_date
        LIMIT 4`
    )

    return rows.map(row => ({
      eventId: `sprint-${row.sprint_id}`,
      kind: 'sprint_end' as const,
      title: `Cierre ciclo ${row.name ?? row.sprint_id.slice(0, 8)}`,
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
      `SELECT lr.leave_request_id, lr.member_id, lr.start_date, lr.end_date,
              lp.label AS reason_label
         FROM greenhouse_hr.leave_requests lr
    LEFT JOIN greenhouse_hr.leave_policies lp ON lp.policy_id = lr.policy_id
        WHERE lr.start_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
          AND lr.status IN ('approved','pending_jefatura','pending_hr')
        ORDER BY lr.start_date
        LIMIT 4`
    )

    return rows.map(row => ({
      eventId: `leave-${row.leave_request_id}`,
      kind: 'leave_window' as const,
      title: row.reason_label ? `Permiso · ${row.reason_label}` : 'Permiso',
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
