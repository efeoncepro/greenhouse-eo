import 'server-only'

import { getPayrollEntries } from '@/lib/payroll/get-payroll-entries'
import { getPayrollPeriod } from '@/lib/payroll/get-payroll-periods'
import { PayrollValidationError, escapeCsvValue } from '@/lib/payroll/shared'

const buildPayrollCsv = (entries: Awaited<ReturnType<typeof getPayrollEntries>>) => {
  const headers = [
    'Nombre',
    'Email',
    'Regimen',
    'Moneda',
    'Salario base',
    'Base ajustada',
    'Asignacion teletrabajo',
    'Teletrabajo ajustado',
    'Colacion',
    'Movilizacion',
    'Etiqueta bono fijo',
    'Bono fijo',
    'Bono fijo ajustado',
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
    'AFP cotización',
    'AFP comisión',
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
      (() => {
        const entryWithAllowances = entry as typeof entry & {
          chileColacionAmount?: number | null
          chileMovilizacionAmount?: number | null
          chileColacion?: number | null
          chileMovilizacion?: number | null
          colacionAmount?: number | null
          movilizacionAmount?: number | null
          totalHaberesNoImponibles?: number | null
        }

        const colacion =
          entryWithAllowances.chileColacionAmount ??
          entryWithAllowances.chileColacion ??
          entryWithAllowances.colacionAmount ??
          0

        const movilizacion =
          entryWithAllowances.chileMovilizacionAmount ??
          entryWithAllowances.chileMovilizacion ??
          entryWithAllowances.movilizacionAmount ??
          0

        return [
          entry.memberName,
          entry.memberEmail,
          entry.payRegime,
          entry.currency,
          entry.baseSalary,
          entry.adjustedBaseSalary,
          entry.remoteAllowance,
          entry.adjustedRemoteAllowance,
          colacion,
          movilizacion,
          entry.fixedBonusLabel,
          entry.fixedBonusAmount,
          entry.adjustedFixedBonusAmount,
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
          entry.chileAfpCotizacionAmount,
          entry.chileAfpComisionAmount,
          entry.chileHealthAmount,
          entry.chileUnemploymentAmount,
          entry.chileTaxAmount,
          entry.chileApvAmount,
          entry.chileTotalDeductions,
          entry.netTotal
        ]
      })()
        .map(escapeCsvValue)
        .join(',')
    )
  ]

  return lines.join('\n')
}

export const generatePayrollCsv = async (periodId: string) => {
  const period = await getPayrollPeriod(periodId)

  if (!period) {
    throw new PayrollValidationError('Payroll period not found.', 404)
  }

  if (period.status !== 'approved' && period.status !== 'exported') {
    throw new PayrollValidationError('Only approved payroll periods can be exported.', 409)
  }

  const entries = await getPayrollEntries(periodId)

  return buildPayrollCsv(entries)
}

export const exportPayrollCsv = generatePayrollCsv
