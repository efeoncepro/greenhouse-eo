import type { PoolClient } from 'pg'

import { query } from '@/lib/db'

const toNumber = (value: unknown) => {
  const numberValue = Number(value ?? 0)

  return Number.isFinite(numberValue) ? numberValue : 0
}

export interface PayrollOverlapLedger {
  schemaVersion: 1
  periodId: string
  periodStatus: string | null
  periodExportedAt: string | null
  entryId: string | null
  entryIsActive: boolean
  coveredByMonthlyPayroll: boolean
  ufValue: number | null
  taxTableVersion: string | null
  coveredAmounts: {
    grossTotal: number
    taxableBase: number
    afp: number
    health: number
    unemployment: number
    tax: number
    apv: number
    statutoryDeductions: number
    netTotal: number
  }
}

type PayrollOverlapRow = Record<string, unknown>

const mapLedger = (row: PayrollOverlapRow | undefined, periodId: string): PayrollOverlapLedger => {
  const periodStatus = typeof row?.status === 'string' ? row.status : null
  const entryId = typeof row?.entry_id === 'string' ? row.entry_id : null
  const entryIsActive = row?.is_active == null ? Boolean(entryId) : Boolean(row.is_active)

  const coveredByMonthlyPayroll = Boolean(
    entryId &&
    entryIsActive &&
    periodStatus &&
    ['calculated', 'approved', 'exported'].includes(periodStatus)
  )

  return {
    schemaVersion: 1,
    periodId,
    periodStatus,
    periodExportedAt: row?.exported_at instanceof Date ? row.exported_at.toISOString() : row?.exported_at?.toString() ?? null,
    entryId,
    entryIsActive,
    coveredByMonthlyPayroll,
    ufValue: row?.uf_value == null ? null : toNumber(row.uf_value),
    taxTableVersion: typeof row?.tax_table_version === 'string' ? row.tax_table_version : null,
    coveredAmounts: {
      grossTotal: coveredByMonthlyPayroll ? toNumber(row?.gross_total) : 0,
      taxableBase: coveredByMonthlyPayroll ? toNumber(row?.chile_taxable_base) : 0,
      afp: coveredByMonthlyPayroll ? toNumber(row?.chile_afp_amount) : 0,
      health: coveredByMonthlyPayroll ? toNumber(row?.chile_health_amount) : 0,
      unemployment: coveredByMonthlyPayroll ? toNumber(row?.chile_unemployment_amount) : 0,
      tax: coveredByMonthlyPayroll ? toNumber(row?.chile_tax_amount) : 0,
      apv: coveredByMonthlyPayroll ? toNumber(row?.chile_apv_amount) : 0,
      statutoryDeductions: coveredByMonthlyPayroll ? toNumber(row?.chile_total_deductions) : 0,
      netTotal: coveredByMonthlyPayroll ? toNumber(row?.net_total) : 0
    }
  }
}

export const resolveFinalSettlementPeriodId = (lastWorkingDay: string) => {
  const year = Number(lastWorkingDay.slice(0, 4))
  const month = Number(lastWorkingDay.slice(5, 7))

  return `${year}-${String(month).padStart(2, '0')}`
}

export const readPayrollOverlapLedger = async (
  memberId: string,
  lastWorkingDay: string,
  client?: PoolClient
): Promise<PayrollOverlapLedger> => {
  const periodId = resolveFinalSettlementPeriodId(lastWorkingDay)

  const sql = `
    SELECT
      pp.period_id,
      pp.status,
      pp.exported_at,
      pp.uf_value,
      pp.tax_table_version,
      pe.entry_id,
      pe.is_active,
      pe.gross_total,
      pe.net_total,
      pe.chile_taxable_base,
      pe.chile_afp_amount,
      pe.chile_health_amount,
      pe.chile_unemployment_amount,
      pe.chile_tax_amount,
      pe.chile_apv_amount,
      pe.chile_total_deductions
    FROM greenhouse_payroll.payroll_periods pp
    LEFT JOIN greenhouse_payroll.payroll_entries pe
      ON pe.period_id = pp.period_id
     AND pe.member_id = $1
     AND COALESCE(pe.is_active, TRUE) = TRUE
    WHERE pp.period_id = $2
    ORDER BY pe.version DESC NULLS LAST, pe.created_at DESC NULLS LAST
    LIMIT 1
  `

  const params = [memberId, periodId]

  const rows = await (client
    ? client.query<PayrollOverlapRow>(sql, params).then(result => result.rows)
    : query<PayrollOverlapRow>(sql, params)).catch(() => [] as PayrollOverlapRow[])

  return mapLedger(rows[0], periodId)
}
