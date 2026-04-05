import 'server-only'

import type { PayrollAttendanceDiagnostics } from '@/types/payroll'

import { getBigQueryProjectId } from '@/lib/bigquery'
import { isGreenhousePostgresConfigured, runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { runPayrollQuery } from '@/lib/payroll/shared'

export type AttendanceSnapshot = {
  workingDaysInPeriod: number
  daysPresent: number
  daysAbsent: number
  daysOnLeave: number
  daysOnUnpaidLeave: number
}

type AttendanceCountRow = {
  member_id: string
  status: string
  count: number | string
}

type LeaveCountRow = {
  member_id: string
  total_days: number | string
  unpaid_days: number | string
}

export const buildMemberLeaveSummary = (leaveRows: LeaveCountRow[]) => {
  const memberLeave = new Map<string, { totalDays: number; unpaidDays: number }>()

  for (const row of leaveRows) {
    memberLeave.set(row.member_id, {
      totalDays: Number(row.total_days),
      unpaidDays: Number(row.unpaid_days)
    })
  }

  return memberLeave
}

const getProjectId = () => getBigQueryProjectId()

export const getPayrollAttendanceDiagnostics = ({
  leaveDataDegraded = false
}: { leaveDataDegraded?: boolean } = {}): PayrollAttendanceDiagnostics => ({
  source: 'legacy_attendance_daily_plus_hr_leave',
  integrationTarget: 'microsoft_teams',
  blocking: leaveDataDegraded,
  leaveDataDegraded,
  notes: [
    'La asistencia aún se resume desde attendance_daily + leave_requests.',
    'La integración futura objetivo para asistencia es Microsoft Teams.',
    ...(leaveDataDegraded
      ? [
          '⚠ Los datos de permisos (leave_requests) no pudieron leerse desde PostgreSQL. Los descuentos por licencia no remunerada pueden ser incorrectos.'
        ]
      : [])
  ]
})

/**
 * Count weekdays (Mon-Fri) between two dates inclusive.
 */
export const countWeekdays = (startDate: string, endDate: string): number => {
  const start = new Date(startDate + 'T00:00:00')
  const end = new Date(endDate + 'T00:00:00')
  let count = 0

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const day = d.getDay()

    if (day !== 0 && day !== 6) {
      count++
    }
  }

  return count
}

/**
 * Fetch attendance summary for all members in a payroll period.
 * Combines BigQuery attendance_daily + Postgres leave_requests.
 */
export type AttendanceResult = {
  snapshots: Map<string, AttendanceSnapshot>
  leaveDataDegraded: boolean
}

export const fetchAttendanceForAllMembers = async (
  memberIds: string[],
  periodStart: string,
  periodEnd: string
): Promise<AttendanceResult> => {
  if (memberIds.length === 0) {
    return { snapshots: new Map(), leaveDataDegraded: false }
  }

  const baseWeekdays = countWeekdays(periodStart, periodEnd)

  // Fetch attendance from BigQuery (present, absent, late, excused, holiday)
  const projectId = getProjectId()

  const [attendanceRows, leaveResult, holidayCountRows] = await Promise.all([
    runPayrollQuery<AttendanceCountRow>(
      `
        SELECT
          a.member_id,
          a.attendance_status AS status,
          COUNT(*) AS count
        FROM \`${projectId}.greenhouse.attendance_daily\` AS a
        WHERE a.attendance_date >= DATE(@periodStart)
          AND a.attendance_date <= DATE(@periodEnd)
          AND a.member_id IN UNNEST(@memberIds)
        GROUP BY a.member_id, a.attendance_status
      `,
      { periodStart, periodEnd, memberIds }
    ),
    fetchApprovedLeaveForPeriod(memberIds, periodStart, periodEnd),
    runPayrollQuery<{ holiday_count: number | string }>(
      `
        SELECT COUNT(DISTINCT a.attendance_date) AS holiday_count
        FROM \`${projectId}.greenhouse.attendance_daily\` AS a
        WHERE a.attendance_date >= DATE(@periodStart)
          AND a.attendance_date <= DATE(@periodEnd)
          AND a.attendance_status = 'holiday'
        LIMIT 1
      `,
      { periodStart, periodEnd }
    )
  ])

  const holidayCount = Number(holidayCountRows[0]?.holiday_count ?? 0)
  const workingDaysInPeriod = Math.max(1, baseWeekdays - holidayCount)

  // Build per-member attendance counts from BigQuery
  const memberAttendance = new Map<string, Map<string, number>>()

  for (const row of attendanceRows) {
    if (!memberAttendance.has(row.member_id)) {
      memberAttendance.set(row.member_id, new Map())
    }

    memberAttendance.get(row.member_id)!.set(row.status, Number(row.count))
  }

  // Build per-member leave counts from Postgres
  const { rows: leaveRows, degraded: leaveDataDegraded } = leaveResult
  const memberLeave = buildMemberLeaveSummary(leaveRows)

  // Assemble snapshots
  const result = new Map<string, AttendanceSnapshot>()

  for (const memberId of memberIds) {
    const counts = memberAttendance.get(memberId)
    const leave = memberLeave.get(memberId)

    const daysPresent = (counts?.get('present') ?? 0) + (counts?.get('late') ?? 0) + (counts?.get('excused') ?? 0)
    const daysAbsent = counts?.get('absent') ?? 0
    const daysOnLeave = leave?.totalDays ?? 0
    const daysOnUnpaidLeave = leave?.unpaidDays ?? 0

    result.set(memberId, {
      workingDaysInPeriod,
      daysPresent,
      daysAbsent,
      daysOnLeave,
      daysOnUnpaidLeave
    })
  }

  return { snapshots: result, leaveDataDegraded }
}

export const fetchAttendanceForPayrollPeriod = async (memberIds: string[], periodStart: string, periodEnd: string) => {
  const { snapshots, leaveDataDegraded } = await fetchAttendanceForAllMembers(memberIds, periodStart, periodEnd)

  return {
    snapshots,
    leaveDataDegraded,
    diagnostics: getPayrollAttendanceDiagnostics({ leaveDataDegraded })
  }
}

/**
 * Query approved leave requests for the period from Postgres.
 * Falls back to empty if Postgres is not configured.
 */
type LeaveQueryResult = { rows: LeaveCountRow[]; degraded: boolean }

const fetchApprovedLeaveForPeriod = async (
  memberIds: string[],
  periodStart: string,
  periodEnd: string
): Promise<LeaveQueryResult> => {
  if (!isGreenhousePostgresConfigured()) {
    console.warn('[payroll] PostgreSQL not configured — leave data unavailable, marking as degraded')

    return { rows: [], degraded: true }
  }

  try {
    const rows = await runGreenhousePostgresQuery<LeaveCountRow>(
      `
        SELECT
          r.member_id,
          COALESCE(SUM(r.requested_days), 0) AS total_days,
          COALESCE(SUM(
            CASE WHEN t.is_paid = FALSE THEN r.requested_days ELSE 0 END
          ), 0) AS unpaid_days
        FROM greenhouse_hr.leave_requests AS r
        INNER JOIN greenhouse_hr.leave_types AS t ON t.leave_type_code = r.leave_type_code
        WHERE r.status = 'approved'
          AND r.start_date <= $1::date
          AND r.end_date >= $2::date
          AND r.member_id = ANY($3)
        GROUP BY r.member_id
      `,
      [periodEnd, periodStart, memberIds]
    )

    return { rows, degraded: false }
  } catch (error) {
    console.warn('[payroll] Failed to fetch leave data from Postgres:', error instanceof Error ? error.message : error)

    return { rows: [], degraded: true }
  }
}
