import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { PersonPayrollFacet, FacetFetchContext } from '@/types/person-complete-360'

type CompensationRow = {
  version_id: string
  currency: string | null
  base_salary: string | number | null
  remote_allowance: string | number | null
  colacion: string | number | null
  movilizacion: string | number | null
  fixed_bonus: string | number | null
  total_comp: string | number | null
  pay_regime: string | null
  contract_type: string | null
  afp_name: string | null
  health_system: string | null
  effective_from: string | null
  change_reason: string | null
}

type PayrollEntryRow = {
  period_year: number
  period_month: number
  gross_total: string | number
  net_total: string | number
  status: string | null
  currency: string | null
  working_days: number | null
  days_present: number | null
  days_absent: number | null
  days_on_leave: number | null
}

const toNum = (v: unknown): number => {
  if (typeof v === 'number') return v

  if (typeof v === 'string') { const n = Number(v);

 

return Number.isFinite(n) ? n : 0 }
  
return 0
}

const toNullNum = (v: unknown): number | null => {
  if (v === null || v === undefined) return null
  const n = toNum(v)

  
return Number.isFinite(n) ? n : null
}

export const fetchPayrollFacet = async (ctx: FacetFetchContext): Promise<PersonPayrollFacet | null> => {
  if (!ctx.memberId) return null

  // Build temporal filter for payroll entry
  let entryFilter = ''
  const entryParams: unknown[] = [ctx.memberId]

  if (ctx.asOf) {
    const d = new Date(ctx.asOf)

    entryFilter = 'AND pp.year = $2 AND pp.month = $3'
    entryParams.push(d.getFullYear(), d.getMonth() + 1)
  }

  const [compensationRows, entryRows, historyRows] = await Promise.all([
    // Current compensation (latest version)
    runGreenhousePostgresQuery<CompensationRow>(
      `SELECT
        cv.version_id,
        cv.currency,
        cv.base_salary::text,
        cv.remote_allowance::text,
        cv.colacion::text,
        cv.movilizacion::text,
        cv.fixed_bonus::text,
        cv.total_comp::text,
        cv.pay_regime,
        cv.contract_type,
        cv.afp_name,
        cv.health_system,
        cv.effective_from::text,
        cv.change_reason
      FROM greenhouse_payroll.compensation_versions cv
      WHERE cv.member_id = $1
        AND cv.is_current = TRUE
      LIMIT 1`,
      [ctx.memberId]
    ).catch(() => [] as CompensationRow[]),

    // Latest payroll entry (or by asOf period)
    runGreenhousePostgresQuery<PayrollEntryRow>(
      `SELECT
        pp.year AS period_year,
        pp.month AS period_month,
        pe.gross_total::text,
        pe.net_total::text,
        pp.status,
        pe.currency,
        pe.working_days,
        pe.days_present,
        pe.days_absent,
        pe.days_on_leave
      FROM greenhouse_payroll.payroll_entries pe
      JOIN greenhouse_payroll.payroll_periods pp ON pp.period_id = pe.period_id
      WHERE pe.member_id = $1
        ${entryFilter}
      ORDER BY pp.year DESC, pp.month DESC
      LIMIT 1`,
      entryParams
    ).catch(() => [] as PayrollEntryRow[]),

    // Compensation history (last 10 versions)
    runGreenhousePostgresQuery<CompensationRow>(
      `SELECT
        cv.version_id,
        cv.effective_from::text,
        cv.base_salary::text,
        cv.currency,
        cv.change_reason
      FROM greenhouse_payroll.compensation_versions cv
      WHERE cv.member_id = $1
      ORDER BY cv.effective_from DESC
      LIMIT 10`,
      [ctx.memberId]
    ).catch(() => [] as CompensationRow[])
  ])

  const comp = compensationRows[0]
  const entry = entryRows[0]

  return {
    currentCompensation: comp
      ? {
          currency: comp.currency,
          baseSalary: toNullNum(comp.base_salary),
          remoteAllowance: toNullNum(comp.remote_allowance),
          colacion: toNullNum(comp.colacion),
          movilizacion: toNullNum(comp.movilizacion),
          fixedBonus: toNullNum(comp.fixed_bonus),
          totalComp: toNullNum(comp.total_comp),
          payRegime: comp.pay_regime,
          contractType: comp.contract_type,
          afpName: comp.afp_name,
          healthSystem: comp.health_system,
          effectiveFrom: comp.effective_from ? comp.effective_from.slice(0, 10) : null
        }
      : null,
    lastEntry: entry
      ? {
          periodYear: toNum(entry.period_year),
          periodMonth: toNum(entry.period_month),
          grossTotal: toNum(entry.gross_total),
          netTotal: toNum(entry.net_total),
          status: entry.status,
          currency: entry.currency,
          workingDays: entry.working_days != null ? toNum(entry.working_days) : null,
          daysPresent: entry.days_present != null ? toNum(entry.days_present) : null,
          daysAbsent: entry.days_absent != null ? toNum(entry.days_absent) : null,
          daysOnLeave: entry.days_on_leave != null ? toNum(entry.days_on_leave) : null
        }
      : null,
    compensationHistory: historyRows.map(r => ({
      versionId: r.version_id,
      effectiveFrom: r.effective_from ? r.effective_from.slice(0, 10) : '',
      baseSalary: toNum(r.base_salary),
      currency: r.currency,
      changeReason: r.change_reason
    }))
  }
}
