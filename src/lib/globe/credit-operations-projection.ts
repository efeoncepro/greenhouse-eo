import 'server-only'

import { randomUUID } from 'node:crypto'

import {
  GLOBE_CREDIT_ADMIN_READERS,
  type CreditBudgetAlertV1,
  type CreditExhaustionForecastV1,
  type CreditGrantV1,
  type CreditPoolV1,
  type ProjectBudgetV1
} from '@efeonce-globe/contracts/credit-administration'
import { GLOBE_CREDIT_READERS, type CreditLedgerEntryV1 } from '@efeonce-globe/contracts/credits'

import { createGreenhouseGlobeClient, type GreenhouseGlobeClientDependencies } from './client'

const READERS = {
  pools: GLOBE_CREDIT_ADMIN_READERS.pools,
  grants: GLOBE_CREDIT_ADMIN_READERS.grants,
  budgets: GLOBE_CREDIT_ADMIN_READERS.budgets,
  forecast: GLOBE_CREDIT_ADMIN_READERS.forecast,
  alerts: GLOBE_CREDIT_ADMIN_READERS.alerts,
  ledger: GLOBE_CREDIT_READERS.entries
} as const

export type GlobeCreditProjectionSection = keyof typeof READERS

export type GlobeCreditOperationsProjection = Readonly<{
  pools: readonly CreditPoolV1[]
  grants: readonly CreditGrantV1[]
  budgets: readonly ProjectBudgetV1[]
  forecast: CreditExhaustionForecastV1 | null
  alerts: readonly CreditBudgetAlertV1[]
  ledger: readonly CreditLedgerEntryV1[]
  unavailable: readonly GlobeCreditProjectionSection[]
}>

type ReaderDispatch = (reader: string, query: Readonly<Record<string, unknown>>) => Promise<unknown>

export type ReadGlobeCreditOperationsProjectionDependencies = GreenhouseGlobeClientDependencies &
  Readonly<{
    dispatch?: ReaderDispatch
  }>

export async function readGlobeCreditOperationsProjection(
  input: Readonly<{ globeWorkspaceId: string; limit?: number; correlationId?: string }>,
  dependencies: ReadGlobeCreditOperationsProjectionDependencies = {}
): Promise<GlobeCreditOperationsProjection> {
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 100)
  const dispatch = dependencies.dispatch ?? defaultDispatch(input.globeWorkspaceId, input.correlationId, dependencies)

  const requests = {
    pools: dispatch(READERS.pools, { limit }),
    grants: dispatch(READERS.grants, { limit }),
    budgets: dispatch(READERS.budgets, { limit }),
    forecast: dispatch(READERS.forecast, { lookbackDays: 30 }),
    alerts: dispatch(READERS.alerts, { limit }),
    ledger: dispatch(READERS.ledger, { limit })
  } as const

  const keys = Object.keys(requests) as GlobeCreditProjectionSection[]
  const settled = await Promise.allSettled(keys.map(key => requests[key]))
  const values = new Map<GlobeCreditProjectionSection, unknown>()
  const unavailable: GlobeCreditProjectionSection[] = []

  settled.forEach((result, index) => {
    const key = keys[index]!

    if (result.status === 'fulfilled') values.set(key, result.value)
    else unavailable.push(key)
  })

  return {
    pools: parseScopedArray(values.get('pools'), input.globeWorkspaceId, isPool, unavailable, 'pools'),
    grants: parseScopedArray(values.get('grants'), input.globeWorkspaceId, isGrant, unavailable, 'grants'),
    budgets: parseScopedArray(values.get('budgets'), input.globeWorkspaceId, isBudget, unavailable, 'budgets'),
    forecast: parseForecast(values.get('forecast'), input.globeWorkspaceId, unavailable),
    alerts: parseScopedArray(values.get('alerts'), input.globeWorkspaceId, isAlert, unavailable, 'alerts'),
    ledger: parseScopedArray(values.get('ledger'), input.globeWorkspaceId, isLedgerEntry, unavailable, 'ledger'),
    unavailable: [...new Set(unavailable)]
  }
}

function defaultDispatch(
  workspaceId: string,
  correlationId: string | undefined,
  dependencies: GreenhouseGlobeClientDependencies
): ReaderDispatch {
  const { client } = createGreenhouseGlobeClient(process.env, dependencies)

  return async (reader, query) => {
    const result = await client.dispatchReader<unknown>(reader, query, {
      workspaceId,
      correlationId: correlationId ?? randomUUID()
    })

    return result.data
  }
}

function parseScopedArray<T extends Readonly<{ workspaceId: string }>>(
  raw: unknown,
  workspaceId: string,
  guard: (value: unknown) => value is T,
  unavailable: GlobeCreditProjectionSection[],
  section: GlobeCreditProjectionSection
): readonly T[] {
  if (raw === undefined) return []

  if (!Array.isArray(raw) || raw.some(value => !guard(value) || value.workspaceId !== workspaceId)) {
    unavailable.push(section)

    return []
  }

  return raw
}

function parseForecast(
  raw: unknown,
  workspaceId: string,
  unavailable: GlobeCreditProjectionSection[]
): CreditExhaustionForecastV1 | null {
  if (raw === undefined) return null

  if (
    !record(raw) ||
    raw.schemaVersion !== '1' ||
    raw.workspaceId !== workspaceId ||
    !['available', 'insufficient-data'].includes(String(raw.status)) ||
    !nonNegative(raw.observedDays) ||
    !nonNegative(raw.effectiveAvailable) ||
    !iso(raw.computedAt) ||
    !nonNegative(raw.freshnessSeconds)
  ) {
    unavailable.push('forecast')

    return null
  }

  return raw as CreditExhaustionForecastV1
}

function isPool(raw: unknown): raw is CreditPoolV1 {
  return (
    record(raw) &&
    raw.schemaVersion === '1' &&
    text(raw.poolId) &&
    text(raw.workspaceId) &&
    text(raw.name) &&
    ['draft', 'active', 'paused', 'closed'].includes(String(raw.status)) &&
    nonNegative(raw.priority) &&
    iso(raw.periodStart) &&
    iso(raw.periodEnd)
  )
}

function isGrant(raw: unknown): raw is CreditGrantV1 {
  return (
    record(raw) &&
    raw.schemaVersion === '1' &&
    text(raw.grantId) &&
    text(raw.workspaceId) &&
    text(raw.poolId) &&
    ['internal', 'engagement', 'promotional', 'corrective'].includes(String(raw.kind)) &&
    ['pending', 'posted', 'cancelled', 'corrected'].includes(String(raw.status)) &&
    nonNegative(raw.credits)
  )
}

function isBudget(raw: unknown): raw is ProjectBudgetV1 {
  return (
    record(raw) &&
    raw.schemaVersion === '1' &&
    text(raw.budgetId) &&
    text(raw.workspaceId) &&
    text(raw.projectId) &&
    ['active', 'paused', 'superseded'].includes(String(raw.status)) &&
    nonNegative(raw.capCredits) &&
    iso(raw.periodStart) &&
    iso(raw.periodEnd)
  )
}

function isAlert(raw: unknown): raw is CreditBudgetAlertV1 {
  return (
    record(raw) &&
    raw.schemaVersion === '1' &&
    text(raw.alertId) &&
    text(raw.workspaceId) &&
    ['low_balance', 'exhausted', 'expiry_policy_disabled', 'usage_anomaly', 'projection_drift'].includes(
      String(raw.kind)
    ) &&
    ['info', 'warning', 'critical'].includes(String(raw.severity)) &&
    ['open', 'acknowledged'].includes(String(raw.status))
  )
}

function isLedgerEntry(raw: unknown): raw is CreditLedgerEntryV1 {
  return (
    record(raw) &&
    raw.schemaVersion === '1' &&
    text(raw.entryId) &&
    text(raw.workspaceId) &&
    ['allocation', 'reservation', 'settlement', 'release', 'expiration', 'adjustment'].includes(String(raw.kind)) &&
    Number.isSafeInteger(raw.allocatedDelta) &&
    Number.isSafeInteger(raw.reservedDelta) &&
    Number.isSafeInteger(raw.spentDelta) &&
    Number.isSafeInteger(raw.adjustmentDelta) &&
    iso(raw.createdAt)
  )
}

function record(raw: unknown): raw is Record<string, unknown> {
  return Boolean(raw) && typeof raw === 'object' && !Array.isArray(raw)
}

function text(raw: unknown): raw is string {
  return typeof raw === 'string' && raw.length > 0 && raw.length <= 1024
}

function nonNegative(raw: unknown): raw is number {
  return typeof raw === 'number' && Number.isFinite(raw) && raw >= 0
}

function iso(raw: unknown): raw is string {
  return typeof raw === 'string' && Number.isFinite(Date.parse(raw))
}
