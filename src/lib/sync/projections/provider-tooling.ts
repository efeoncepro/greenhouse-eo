import 'server-only'

import { materializeProviderToolingSnapshotsForPeriod } from '@/lib/providers/provider-tooling-snapshots'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import type { ProjectionDefinition } from '../projection-registry'

const pad2 = (value: number) => String(value).padStart(2, '0')

const parsePeriodId = (value: unknown): { year: number; month: number } | null => {
  if (typeof value !== 'string') return null

  const match = value.match(/^(\d{4})-(\d{2})$/)

  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return null
  }

  return { year, month }
}

const parseDateLike = (value: unknown): { year: number; month: number } | null => {
  if (typeof value !== 'string') return null

  const match = value.match(/^(\d{4})-(\d{2})-\d{2}/)

  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return null
  }

  return { year, month }
}

const toInteger = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isInteger(value)) return value

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)

    return Number.isInteger(parsed) ? parsed : null
  }

  return null
}

export const getProviderToolingPeriodFromPayload = (payload: Record<string, unknown>) => {
  const explicitYear = toInteger(payload.periodYear) ?? toInteger(payload.year)
  const explicitMonth = toInteger(payload.periodMonth) ?? toInteger(payload.month)

  if (explicitYear && explicitMonth && explicitMonth >= 1 && explicitMonth <= 12) {
    return { year: explicitYear, month: explicitMonth }
  }

  return (
    parsePeriodId(payload.periodId) ??
    parsePeriodId(payload.payrollPeriodId) ??
    parseDateLike(payload.activatedAt) ??
    parseDateLike(payload.expiresAt) ??
    parseDateLike(payload.updatedAt) ??
    parseDateLike(payload.updated_at) ??
    parseDateLike(payload.invoiceDate) ??
    parseDateLike(payload.documentDate) ??
    parseDateLike(payload.paymentDate) ??
    null
  )
}

export const getProviderToolingScopeFromPayload = (payload: Record<string, unknown>) => {
  const period = getProviderToolingPeriodFromPayload(payload)

  if (period) {
    return {
      entityType: 'finance_period',
      entityId: `${period.year}-${pad2(period.month)}`
    }
  }

  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())
  const match = today.match(/^(\d{4})-(\d{2})-\d{2}$/)
  const year = match ? Number(match[1]) : new Date().getFullYear()
  const month = match ? Number(match[2]) : new Date().getMonth() + 1

  return {
    entityType: 'finance_period',
    entityId: `${year}-${pad2(month)}`
  }
}

export const PROVIDER_TOOLING_TRIGGER_EVENTS = [
  'provider.upserted',
  'finance.supplier.created',
  'finance.supplier.updated',
  'ai_tool.created',
  'ai_tool.updated',
  'ai_license.created',
  'ai_license.reactivated',
  'ai_license.updated',
  'ai_wallet.created',
  'ai_wallet.updated',
  'ai_wallet.credits_consumed',
  'finance.expense.created',
  'finance.expense.updated',
  'finance.license_cost.updated',
  'finance.tooling_cost.updated',
  'payroll_period.calculated',
  'payroll_period.approved',
  'payroll_period.exported',
  'payroll_entry.upserted'
] as const

export const providerToolingProjection: ProjectionDefinition = {
  name: 'provider_tooling',
  description: 'Materialize provider-centric tooling, finance, and payroll monthly snapshots',
  domain: 'finance',
  triggerEvents: [...PROVIDER_TOOLING_TRIGGER_EVENTS],
  extractScope: getProviderToolingScopeFromPayload,
  refresh: async (scope, payload) => {
    const [yearStr, monthStr] = scope.entityId.split('-')
    const year = Number(yearStr)
    const month = Number(monthStr)

    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
      return null
    }

    const eventType = typeof payload._eventType === 'string' ? payload._eventType : 'reactive-refresh'

    const snapshots = await materializeProviderToolingSnapshotsForPeriod(
      year,
      month,
      `reactive-refresh:${eventType}:${scope.entityId}`
    )

    for (const snapshot of snapshots) {
      await publishOutboxEvent({
        aggregateType: 'provider_tooling_snapshot',
        aggregateId: snapshot.snapshotId,
        eventType: 'provider.tooling_snapshot.materialized',
        payload: {
          providerId: snapshot.providerId,
          providerName: snapshot.providerName,
          supplierId: snapshot.supplierId,
          periodYear: snapshot.periodYear,
          periodMonth: snapshot.periodMonth,
          periodId: snapshot.periodId,
          activeLicenseCount: snapshot.activeLicenseCount,
          activeMemberCount: snapshot.activeMemberCount,
          financeExpenseTotalClp: snapshot.financeExpenseTotalClp,
          subscriptionCostTotalClp: snapshot.subscriptionCostTotalClp,
          usageCostTotalClp: snapshot.usageCostTotalClp,
          payrollMemberCount: snapshot.payrollMemberCount,
          licensedMemberPayrollCostClp: snapshot.licensedMemberPayrollCostClp,
          totalProviderCostClp: snapshot.totalProviderCostClp
        }
      })
    }

    return `materialized provider_tooling: ${snapshots.length} providers for ${scope.entityId} via ${eventType}`
  },
  maxRetries: 1
}
