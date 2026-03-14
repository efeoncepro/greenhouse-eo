import 'server-only'

import { getPayrollEntries } from '@/lib/payroll/get-payroll-entries'
import { getPayrollPeriod } from '@/lib/payroll/get-payroll-periods'
import { PayrollValidationError, escapeCsvValue, runPayrollQuery } from '@/lib/payroll/shared'
import { getBigQueryProjectId } from '@/lib/bigquery'

const projectId = getBigQueryProjectId()

export const exportPayrollCsv = async (periodId: string) => {
  const period = await getPayrollPeriod(periodId)

  if (!period) {
    throw new PayrollValidationError('Payroll period not found.', 404)
  }

  if (period.status !== 'approved' && period.status !== 'exported') {
    throw new PayrollValidationError('Only approved payroll periods can be exported.', 409)
  }

  const entries = await getPayrollEntries(periodId)

  const headers = [
    'Nombre',
    'Email',
    'Regimen',
    'Moneda',
    'Salario base',
    'Asignacion teletrabajo',
    'OTD% mes',
    'Bono OTD',
    'RpA mes',
    'Bono RpA',
    'Bono adicional',
    'Total bruto',
    'AFP',
    'Salud',
    'Seg. cesantia',
    'Impuesto',
    'APV',
    'Total descuentos',
    'Neto a pagar'
  ]

  const lines = [
    headers.join(','),
    ...entries.map(entry =>
      [
        entry.memberName,
        entry.memberEmail,
        entry.payRegime,
        entry.currency,
        entry.baseSalary,
        entry.remoteAllowance,
        entry.kpiOtdPercent,
        entry.bonusOtdAmount,
        entry.kpiRpaAvg,
        entry.bonusRpaAmount,
        entry.bonusOtherAmount,
        entry.grossTotal,
        entry.chileAfpAmount,
        entry.chileHealthAmount,
        entry.chileUnemploymentAmount,
        entry.chileTaxAmount,
        entry.chileApvAmount,
        entry.chileTotalDeductions,
        entry.netTotal
      ]
        .map(escapeCsvValue)
        .join(',')
    )
  ]

  await runPayrollQuery(
    `
      UPDATE \`${projectId}.greenhouse.payroll_periods\`
      SET
        status = 'exported',
        exported_at = CURRENT_TIMESTAMP()
      WHERE period_id = @periodId
        AND status = 'approved'
    `,
    { periodId }
  )

  return lines.join('\n')
}
