import 'server-only'

import { getPayrollEntries } from '@/lib/payroll/get-payroll-entries'
import { getPayrollPeriod } from '@/lib/payroll/get-payroll-periods'
import { PayrollValidationError, escapeCsvValue } from '@/lib/payroll/shared'
import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import { isPayrollPostgresEnabled, pgSetPeriodExported } from '@/lib/payroll/postgres-store'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'

const getProjectId = () => getBigQueryProjectId()

const getDmlAffectedRows = (job: unknown) =>
  Number(
    (job as {
      metadata?: {
        statistics?: {
          query?: {
            numDmlAffectedRows?: string | number
          }
        }
      }
    } | undefined)?.metadata?.statistics?.query?.numDmlAffectedRows ?? 0
  )

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

  if (period.status === 'approved') {
    if (isPayrollPostgresEnabled()) {
      await pgSetPeriodExported(periodId)
    } else {
      const [, job] = await getBigQueryClient().query({
        query: `
          UPDATE \`${projectId}.greenhouse.payroll_periods\`
          SET
            status = 'exported',
            exported_at = CURRENT_TIMESTAMP()
          WHERE period_id = @periodId
            AND status = 'approved'
        `,
        params: { periodId }
      })

      if (getDmlAffectedRows(job) === 1) {
        await publishOutboxEvent({
          aggregateType: AGGREGATE_TYPES.payrollPeriod,
          aggregateId: periodId,
          eventType: EVENT_TYPES.payrollPeriodExported,
          payload: {
            periodId,
            year: period.year,
            month: period.month,
            status: 'exported'
          }
        })
      }
    }
  }

  return lines.join('\n')
}
