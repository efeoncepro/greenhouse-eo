import 'server-only'

import { getFinanceCurrentPeriod } from '@/lib/finance/reporting'

export const COMMERCIAL_COST_BASIS_SCOPES = ['people', 'tools', 'bundle', 'roles'] as const

export type CommercialCostBasisScope = (typeof COMMERCIAL_COST_BASIS_SCOPES)[number]

export type CommercialCostBasisTenantScope = {
  organizationId?: string | null
  clientId?: string | null
  spaceId?: string | null
}

export type CommercialCostBasisRequest = {
  scope: CommercialCostBasisScope
  year: number
  month: number
  monthsBack: number
  recomputeEconomics: boolean
  triggerSource: string
  triggeredBy: string
  notes: string | null
  tenantScope: CommercialCostBasisTenantScope
}

export type CommercialCostBasisPeriod = {
  year: number
  month: number
  periodId: string
}

export type CommercialCostBasisPeriodResult = {
  periodId: string
  year: number
  month: number
  scope: CommercialCostBasisScope
  status: 'succeeded' | 'failed' | 'partial'
  snapshotKey: string
  recordsRead: number
  recordsWritten: number
  recordsFailed: number
  eventsPublished: number
  durationMs: number
  summary: Record<string, unknown>
}

export type CommercialCostBasisRunResult = {
  runId: string
  scope: CommercialCostBasisScope
  periods: CommercialCostBasisPeriodResult[]
  status: 'succeeded' | 'failed' | 'partial'
  durationMs: number
  periodsProcessed: number
  recordsRead: number
  recordsWritten: number
  recordsFailed: number
  eventsPublished: number
}

const toInt = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isInteger(value)) return value

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)

    if (Number.isInteger(parsed)) {
      return parsed
    }
  }

  return null
}

const toBoolean = (value: unknown, fallback: boolean) => {
  if (typeof value === 'boolean') return value

  if (typeof value === 'string') {
    if (value === 'true') return true
    if (value === 'false') return false
  }

  return fallback
}

const toNullableString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null

  const trimmed = value.trim()

  return trimmed === '' ? null : trimmed
}

const isScope = (value: unknown): value is CommercialCostBasisScope =>
  typeof value === 'string' && COMMERCIAL_COST_BASIS_SCOPES.includes(value as CommercialCostBasisScope)

export const getCommercialCostBasisPeriodId = (year: number, month: number) =>
  `${year}-${String(month).padStart(2, '0')}`

export const resolveCommercialCostBasisPeriods = (
  request: Pick<CommercialCostBasisRequest, 'year' | 'month' | 'monthsBack'>
): CommercialCostBasisPeriod[] => {
  const cursor = new Date(Date.UTC(request.year, request.month - 1, 1))
  const periods: CommercialCostBasisPeriod[] = []

  for (let offset = 0; offset < request.monthsBack; offset += 1) {
    const year = cursor.getUTCFullYear()
    const month = cursor.getUTCMonth() + 1

    periods.push({
      year,
      month,
      periodId: getCommercialCostBasisPeriodId(year, month)
    })

    cursor.setUTCMonth(cursor.getUTCMonth() - 1)
  }

  return periods
}

export const normalizeCommercialCostBasisRequest = (
  raw: Record<string, unknown>,
  overrides: Partial<CommercialCostBasisRequest> = {}
): CommercialCostBasisRequest => {
  const currentPeriod = getFinanceCurrentPeriod()
  const scope = overrides.scope ?? (isScope(raw.scope) ? raw.scope : 'bundle')
  const year = overrides.year ?? toInt(raw.year) ?? currentPeriod.year
  const month = overrides.month ?? toInt(raw.month) ?? currentPeriod.month
  const monthsBack = Math.max(1, overrides.monthsBack ?? toInt(raw.monthsBack) ?? 1)

  if (month < 1 || month > 12) {
    throw new Error('month must be between 1 and 12')
  }

  return {
    scope,
    year,
    month,
    monthsBack,
    recomputeEconomics: overrides.recomputeEconomics ?? toBoolean(raw.recomputeEconomics, true),
    triggerSource: overrides.triggerSource ?? toNullableString(raw.triggerSource) ?? 'manual',
    triggeredBy: overrides.triggeredBy ?? toNullableString(raw.triggeredBy) ?? 'commercial_cost_worker',
    notes: overrides.notes ?? toNullableString(raw.notes),
    tenantScope: {
      organizationId: overrides.tenantScope?.organizationId ?? toNullableString(raw.organizationId),
      clientId: overrides.tenantScope?.clientId ?? toNullableString(raw.clientId),
      spaceId: overrides.tenantScope?.spaceId ?? toNullableString(raw.spaceId)
    }
  }
}
