import 'server-only'

import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { projectPayrollForPeriod } from '@/lib/payroll/project-payroll'
import { upsertProjectedPayrollSnapshot } from '@/lib/payroll/projected-payroll-store'
import type { ProjectionDefinition } from '../projection-registry'

// ── Helpers ──

const getCurrentPeriod = () => {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())
  const match = today.match(/^(\d{4})-(\d{2})-\d{2}$/)

  return {
    year: match ? Number(match[1]) : new Date().getFullYear(),
    month: match ? Number(match[2]) : new Date().getMonth() + 1
  }
}

const parsePeriodFromPayload = (payload: Record<string, unknown>): { year: number; month: number } | null => {
  if (payload.periodYear && payload.periodMonth) {
    return { year: Number(payload.periodYear), month: Number(payload.periodMonth) }
  }

  const periodId = (payload.payrollPeriodId || payload.periodId) as string | undefined

  if (periodId) {
    const match = periodId.match(/(\d{4})-(\d{2})/)

    if (match) return { year: Number(match[1]), month: Number(match[2]) }
  }

  return null
}

// ── Core refresh ──

const refreshProjectedPayrollForPeriod = async (period: { year: number; month: number }): Promise<string> => {
  let totalUpserted = 0

  for (const mode of ['projected_month_end', 'actual_to_date'] as const) {
    try {
      const result = await projectPayrollForPeriod({ year: period.year, month: period.month, mode })

      for (const entry of result.entries) {
        await upsertProjectedPayrollSnapshot(entry, period)
      }

      totalUpserted += result.entries.length
    } catch (err) {
      console.warn(`[projected-payroll] Failed to refresh ${mode} for ${period.year}-${period.month}:`, err instanceof Error ? err.message : err)
    }
  }

  if (totalUpserted > 0) {
    await publishOutboxEvent({
      aggregateType: AGGREGATE_TYPES.projectedPayroll,
      aggregateId: `${period.year}-${String(period.month).padStart(2, '0')}`,
      eventType: EVENT_TYPES.projectedPayrollPeriodRefreshed,
      payload: { periodYear: period.year, periodMonth: period.month, snapshotCount: totalUpserted }
    }).catch(() => {})
  }

  return `refreshed ${totalUpserted} projected payroll snapshots for ${period.year}-${String(period.month).padStart(2, '0')}`
}

// ── Projection definition ──

export const projectedPayrollProjection: ProjectionDefinition = {
  name: 'projected_payroll',
  description: 'Materialize projected payroll snapshots for current period',
  domain: 'people',

  triggerEvents: [
    'compensation_version.created',
    'compensation_version.updated',
    'payroll_entry.upserted',
    'payroll_period.calculated',
    'finance.exchange_rate.upserted',
    'ico.materialization.completed'
  ],

  extractScope: (payload) => {
    const period = parsePeriodFromPayload(payload) || getCurrentPeriod()

    return { entityType: 'finance_period', entityId: `${period.year}-${String(period.month).padStart(2, '0')}` }
  },

  refresh: async (scope) => {
    const match = scope.entityId.match(/^(\d{4})-(\d{2})$/)

    if (!match) return null

    const period = { year: Number(match[1]), month: Number(match[2]) }

    return refreshProjectedPayrollForPeriod(period)
  },

  maxRetries: 2
}
