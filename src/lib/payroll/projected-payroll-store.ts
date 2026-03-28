import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import type { ProjectedPayrollEntry } from './project-payroll'

// ── Schema ──

let ensured = false

const ensureSchema = async () => {
  if (ensured) return

  await runGreenhousePostgresQuery(`
    CREATE TABLE IF NOT EXISTS greenhouse_serving.projected_payroll_snapshots (
      member_id TEXT NOT NULL,
      period_year INT NOT NULL,
      period_month INT NOT NULL,
      projection_mode TEXT NOT NULL CHECK (projection_mode IN ('actual_to_date', 'projected_month_end')),
      as_of_date DATE NOT NULL,
      currency TEXT NOT NULL,
      base_salary NUMERIC(14,2) NOT NULL DEFAULT 0,
      remote_allowance NUMERIC(14,2) NOT NULL DEFAULT 0,
      fixed_bonus_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
      bonus_otd_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
      bonus_rpa_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
      gross_total NUMERIC(14,2) NOT NULL DEFAULT 0,
      total_deductions NUMERIC(14,2) NOT NULL DEFAULT 0,
      net_total NUMERIC(14,2) NOT NULL DEFAULT 0,
      kpi_otd_percent NUMERIC(5,2),
      kpi_rpa_avg NUMERIC(5,2),
      working_days_cut INT,
      working_days_total INT,
      days_absent INT DEFAULT 0,
      days_on_leave INT DEFAULT 0,
      uf_value NUMERIC(10,2),
      snapshot_status TEXT NOT NULL DEFAULT 'projected',
      materialized_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (member_id, period_year, period_month, projection_mode)
    )
  `).then(() => { ensured = true }).catch(() => {})
}

// ── Write ──

export const upsertProjectedPayrollSnapshot = async (
  entry: ProjectedPayrollEntry,
  period: { year: number; month: number }
) => {
  await ensureSchema()

  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_serving.projected_payroll_snapshots (
       member_id, period_year, period_month, projection_mode, as_of_date,
       currency, base_salary, remote_allowance, fixed_bonus_amount,
       bonus_otd_amount, bonus_rpa_amount, gross_total, total_deductions,
       net_total, kpi_otd_percent, kpi_rpa_avg,
       working_days_cut, working_days_total, days_absent, days_on_leave,
       uf_value, snapshot_status, materialized_at
     )
     VALUES ($1, $2, $3, $4, $5::date,
             $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
             $17, $18, $19, $20, $21, 'projected', CURRENT_TIMESTAMP)
     ON CONFLICT (member_id, period_year, period_month, projection_mode) DO UPDATE SET
       as_of_date = EXCLUDED.as_of_date,
       currency = EXCLUDED.currency,
       base_salary = EXCLUDED.base_salary,
       remote_allowance = EXCLUDED.remote_allowance,
       fixed_bonus_amount = EXCLUDED.fixed_bonus_amount,
       bonus_otd_amount = EXCLUDED.bonus_otd_amount,
       bonus_rpa_amount = EXCLUDED.bonus_rpa_amount,
       gross_total = EXCLUDED.gross_total,
       total_deductions = EXCLUDED.total_deductions,
       net_total = EXCLUDED.net_total,
       kpi_otd_percent = EXCLUDED.kpi_otd_percent,
       kpi_rpa_avg = EXCLUDED.kpi_rpa_avg,
       working_days_cut = EXCLUDED.working_days_cut,
       working_days_total = EXCLUDED.working_days_total,
       days_absent = EXCLUDED.days_absent,
       days_on_leave = EXCLUDED.days_on_leave,
       uf_value = EXCLUDED.uf_value,
       snapshot_status = 'projected',
       materialized_at = CURRENT_TIMESTAMP`,
    [
      entry.memberId, period.year, period.month,
      entry.projectionMode, entry.asOfDate,
      entry.currency, entry.baseSalary, entry.remoteAllowance,
      entry.fixedBonusAmount, entry.bonusOtdAmount, entry.bonusRpaAmount,
      entry.grossTotal, entry.chileTotalDeductions ?? 0, entry.netTotal,
      entry.kpiOtdPercent, entry.kpiRpaAvg,
      entry.projectedWorkingDays, entry.projectedWorkingDaysTotal,
      entry.daysAbsent ?? 0, entry.daysOnLeave ?? 0,
      entry.chileUfValue
    ]
  )
}

// ── Read ──

type SnapshotRow = {
  member_id: string
  currency: string
  gross_total: number | string
  net_total: number | string
  as_of_date: string
  materialized_at: string
}

export const readProjectedPayrollSnapshots = async (
  year: number,
  month: number,
  mode: string
): Promise<Map<string, { grossTotal: number; netTotal: number; asOfDate: string }>> => {
  await ensureSchema()

  const rows = await runGreenhousePostgresQuery<SnapshotRow>(
    `SELECT member_id, currency, gross_total, net_total, as_of_date::text
     FROM greenhouse_serving.projected_payroll_snapshots
     WHERE period_year = $1 AND period_month = $2 AND projection_mode = $3`,
    [year, month, mode]
  )

  const map = new Map<string, { grossTotal: number; netTotal: number; asOfDate: string }>()

  for (const row of rows) {
    map.set(row.member_id, {
      grossTotal: Number(row.gross_total),
      netTotal: Number(row.net_total),
      asOfDate: row.as_of_date
    })
  }

  return map
}
