import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

export interface AttendanceMonthlySnapshot {
  memberId: string
  periodYear: number
  periodMonth: number
  workingDays: number
  daysPresent: number
  daysAbsent: number
  daysOnLeave: number
  daysOnUnpaidLeave: number
  daysHoliday: number
  source: string
  snapshotAt: string | null
}

interface SnapshotRow extends Record<string, unknown> {
  member_id: string
  period_year: number
  period_month: number
  working_days: string | number
  days_present: string | number
  days_absent: string | number
  days_on_leave: string | number
  days_on_unpaid_leave: string | number
  days_holiday: string | number
  source: string
  snapshot_at: string | null
}

const toNum = (v: unknown): number => {
  if (typeof v === 'number') return v
  if (typeof v === 'string') { const n = Number(v); return Number.isFinite(n) ? n : 0 }

  return 0
}

/**
 * Get attendance snapshot for a member and period.
 * Returns from Postgres monthly snapshot if available.
 */
export const getAttendanceSnapshot = async (
  memberId: string,
  year: number,
  month: number
): Promise<AttendanceMonthlySnapshot | null> => {
  const rows = await runGreenhousePostgresQuery<SnapshotRow>(
    `SELECT * FROM greenhouse_payroll.attendance_monthly_snapshot
     WHERE member_id = $1 AND period_year = $2 AND period_month = $3
     LIMIT 1`,
    [memberId, year, month]
  ).catch(() => [] as SnapshotRow[])

  if (rows.length === 0) return null

  const r = rows[0]

  return {
    memberId: r.member_id,
    periodYear: Number(r.period_year),
    periodMonth: Number(r.period_month),
    workingDays: toNum(r.working_days),
    daysPresent: toNum(r.days_present),
    daysAbsent: toNum(r.days_absent),
    daysOnLeave: toNum(r.days_on_leave),
    daysOnUnpaidLeave: toNum(r.days_on_unpaid_leave),
    daysHoliday: toNum(r.days_holiday),
    source: r.source || 'hybrid',
    snapshotAt: r.snapshot_at || null
  }
}

/**
 * Upsert attendance snapshot after fetching from hybrid sources.
 * Called by calculate-payroll.ts to freeze attendance data.
 */
export const upsertAttendanceSnapshot = async (snapshot: AttendanceMonthlySnapshot): Promise<void> => {
  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_payroll.attendance_monthly_snapshot
       (member_id, period_year, period_month, working_days, days_present,
        days_absent, days_on_leave, days_on_unpaid_leave, days_holiday,
        source, snapshot_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
     ON CONFLICT (member_id, period_year, period_month) DO UPDATE SET
       working_days = EXCLUDED.working_days,
       days_present = EXCLUDED.days_present,
       days_absent = EXCLUDED.days_absent,
       days_on_leave = EXCLUDED.days_on_leave,
       days_on_unpaid_leave = EXCLUDED.days_on_unpaid_leave,
       days_holiday = EXCLUDED.days_holiday,
       source = EXCLUDED.source,
       snapshot_at = NOW()`,
    [
      snapshot.memberId, snapshot.periodYear, snapshot.periodMonth,
      snapshot.workingDays, snapshot.daysPresent,
      snapshot.daysAbsent, snapshot.daysOnLeave, snapshot.daysOnUnpaidLeave, snapshot.daysHoliday,
      snapshot.source
    ]
  )
}

/**
 * Get all attendance snapshots for a period (batch).
 */
export const getAttendanceSnapshotsForPeriod = async (
  year: number,
  month: number
): Promise<AttendanceMonthlySnapshot[]> => {
  const rows = await runGreenhousePostgresQuery<SnapshotRow>(
    `SELECT * FROM greenhouse_payroll.attendance_monthly_snapshot
     WHERE period_year = $1 AND period_month = $2`,
    [year, month]
  ).catch(() => [] as SnapshotRow[])

  return rows.map(r => ({
    memberId: r.member_id,
    periodYear: Number(r.period_year),
    periodMonth: Number(r.period_month),
    workingDays: toNum(r.working_days),
    daysPresent: toNum(r.days_present),
    daysAbsent: toNum(r.days_absent),
    daysOnLeave: toNum(r.days_on_leave),
    daysOnUnpaidLeave: toNum(r.days_on_unpaid_leave),
    daysHoliday: toNum(r.days_holiday),
    source: r.source || 'hybrid',
    snapshotAt: r.snapshot_at || null
  }))
}
