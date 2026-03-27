import 'server-only'

import { getPayrollEntries } from '@/lib/payroll/get-payroll-entries'
import { getPayrollPeriod } from '@/lib/payroll/get-payroll-periods'
import { PayrollValidationError, escapeCsvValue, runPayrollQuery } from '@/lib/payroll/shared'
import { getBigQueryProjectId } from '@/lib/bigquery'
import { isPayrollPostgresEnabled, pgSetPeriodExported } from '@/lib/payroll/postgres-store'

const getProjectId = () => getBigQueryProjectId()

export const exportPayrollCsv = async (periodId: string) => {
  const projectId = getProjectId()
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
    'Base ajustada',
    'Asignacion teletrabajo',
    'Teletrabajo ajustado',
    'Dias habiles',
    'Dias presentes',
    'Dias ausentes',
    'Dias licencia',
    'OTD% mes',
    'Factor OTD',
    'Bono OTD',
    'RpA mes',
    'Factor RpA',
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
        entry.adjustedBaseSalary,
        entry.remoteAllowance,
        entry.adjustedRemoteAllowance,
        entry.workingDaysInPeriod,
        entry.daysPresent,
        entry.daysAbsent,
        entry.daysOnLeave,
        entry.kpiOtdPercent,
        entry.bonusOtdProrationFactor,
        entry.bonusOtdAmount,
        entry.kpiRpaAvg,
        entry.bonusRpaProrationFactor,
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

  if (isPayrollPostgresEnabled()) {
    await pgSetPeriodExported(periodId)
  } else {
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
  }

  return lines.join('\n')
}
