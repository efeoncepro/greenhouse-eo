import 'server-only'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import { getPayrollPeriod } from '@/lib/payroll/get-payroll-periods'
import { PayrollValidationError } from '@/lib/payroll/shared'
import { isPayrollPostgresEnabled, pgSetPeriodExported } from '@/lib/payroll/postgres-store'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import type { PayrollPeriod } from '@/types/payroll'

export interface ClosePayrollPeriodResult {
  period: PayrollPeriod
  exportedNow: boolean
}

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

export const closePayrollPeriod = async (periodId: string): Promise<ClosePayrollPeriodResult> => {
  const projectId = getProjectId()
  const period = await getPayrollPeriod(periodId)

  if (!period) {
    throw new PayrollValidationError('Payroll period not found.', 404)
  }

  if (period.status === 'exported') {
    return {
      period,
      exportedNow: false
    }
  }

  if (period.status !== 'approved') {
    throw new PayrollValidationError('Only approved payroll periods can be exported.', 409)
  }

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

    if (getDmlAffectedRows(job) !== 1) {
      const current = await getPayrollPeriod(periodId)

      if (current?.status === 'exported') {
        return {
          period: current,
          exportedNow: false
        }
      }

      throw new PayrollValidationError('Only approved payroll periods can be exported.', 409)
    }

    await publishOutboxEvent({
      aggregateType: AGGREGATE_TYPES.payrollPeriod,
      aggregateId: periodId,
      eventType: EVENT_TYPES.payrollPeriodExported,
      payload: {
        periodId: period.periodId,
        year: period.year,
        month: period.month,
        status: 'exported'
      }
    })
  }

  const updated = await getPayrollPeriod(periodId)

  if (!updated) {
    throw new PayrollValidationError('Payroll period not found after export.', 404)
  }

  return {
    period: updated,
    exportedNow: true
  }
}
