import 'server-only'

import { randomUUID } from 'node:crypto'

import { createGreenhouseGlobeClient, type GreenhouseGlobeClientDependencies } from './client'

const CAPACITY_READER = 'globe.credits.capacity.status.get'

const BLOCKERS = new Set([
  'pool_paused', 'pool_exhausted', 'project_cap_exceeded', 'month_cap_exceeded', 'policy_unavailable'
])

export type GlobeCreditCapacityStatus = Readonly<{
  schemaVersion: '1'
  state: 'ready' | 'limited' | 'blocked' | 'unknown'
  period: Readonly<{ timezone: 'UTC'; start: string; end: string }>
  requestedCredits?: number
  allowed?: boolean
  monthly?: Readonly<{ cap: number; spent: number; held: number; remaining: number }>
  project?: Readonly<{ cap: number; spent: number; held: number; remaining: number }>
  eligibleFunding?: number
  effectiveAvailable?: number
  blockers: readonly string[]
  coverage: Readonly<{ periodStart: string; periodEnd: string; candidateCount: number }>
  freshnessSeconds: number
  asOf: string
  historicalLedger: Readonly<{
    allocated: number
    reserved: number
    spent: number
    adjusted: number
    available: number
    asOf: string
  }>
}>

export type ReadGlobeCreditCapacityInput = Readonly<{
  globeWorkspaceId: string
  requestedCredits: number
  projectId?: string
  capabilityScope?: string
  correlationId?: string
}>

export class GlobeCreditCapacityStatusError extends Error {
  readonly code: 'invalid_projection'

  constructor() {
    super('invalid_projection')
    this.name = 'GlobeCreditCapacityStatusError'
    this.code = 'invalid_projection'
  }
}

export async function readGlobeCreditCapacityStatus(
  input: ReadGlobeCreditCapacityInput,
  dependencies: GreenhouseGlobeClientDependencies = {}
): Promise<GlobeCreditCapacityStatus> {
  if (!Number.isSafeInteger(input.requestedCredits) || input.requestedCredits <= 0) {
    throw new GlobeCreditCapacityStatusError()
  }

  const { client } = createGreenhouseGlobeClient(process.env, dependencies)

  const result = await client.dispatchReader<unknown>(
    CAPACITY_READER,
    {
      requestedCredits: input.requestedCredits,
      ...(input.projectId ? { projectId: input.projectId } : {}),
      ...(input.capabilityScope ? { capabilityScope: input.capabilityScope } : {})
    },
    { workspaceId: input.globeWorkspaceId, correlationId: input.correlationId ?? randomUUID() }
  )

  return parseCapacityStatus(result.data)
}

export function parseCapacityStatus(raw: unknown): GlobeCreditCapacityStatus {
  const root = record(raw)

  if (root.schemaVersion !== '1' || root.audience !== 'operator') invalid()
  const state = oneOf(root.state, ['ready', 'limited', 'blocked', 'unknown'] as const)
  const historicalLedger = ledger(root.historicalLedger)

  if (state === 'unknown') {
    if (root.decision !== undefined) invalid()
    const unavailable = record(root.unavailable)

    
return {
      schemaVersion: '1', state,
      period: period(unavailable.period),
      blockers: blockers(unavailable.blockers),
      coverage: coverage(unavailable.coverage),
      freshnessSeconds: nonNegative(unavailable.freshnessSeconds),
      asOf: iso(unavailable.asOf),
      historicalLedger
    }
  }

  if (root.unavailable !== undefined) invalid()
  const decision = record(root.decision)

  
return {
    schemaVersion: '1', state,
    period: period(decision.period),
    requestedCredits: positive(decision.requestedCredits),
    allowed: boolean(decision.allowed),
    monthly: capacityBand(decision.monthly),
    ...(decision.project === undefined ? {} : { project: capacityBand(decision.project) }),
    eligibleFunding: nonNegative(decision.eligibleFunding),
    effectiveAvailable: nonNegative(decision.effectiveAvailable),
    blockers: blockers(decision.blockers),
    coverage: coverage(decision.coverage),
    freshnessSeconds: nonNegative(decision.freshnessSeconds),
    asOf: iso(decision.asOf),
    historicalLedger
  }
}

function ledger(raw: unknown): GlobeCreditCapacityStatus['historicalLedger'] {
  const value = record(raw)

  
return { allocated: nonNegative(value.allocated), reserved: nonNegative(value.reserved),
    spent: nonNegative(value.spent), adjusted: finite(value.adjusted), available: nonNegative(value.available),
    asOf: iso(value.asOf) }
}

function capacityBand(raw: unknown) {
  const value = record(raw)

  
return { cap: nonNegative(value.cap), spent: nonNegative(value.spent), held: nonNegative(value.held),
    remaining: nonNegative(value.remaining) }
}

function period(raw: unknown): GlobeCreditCapacityStatus['period'] {
  const value = record(raw)

  if (value.schemaVersion !== '1' || value.timezone !== 'UTC') invalid()
  const start = iso(value.start)
  const end = iso(value.end)

  if (start >= end) invalid()
  
return { timezone: 'UTC', start, end }
}

function coverage(raw: unknown): GlobeCreditCapacityStatus['coverage'] {
  const value = record(raw)

  
return { periodStart: iso(value.periodStart), periodEnd: iso(value.periodEnd),
    candidateCount: nonNegative(value.candidateCount) }
}

function blockers(raw: unknown): readonly string[] {
  if (!Array.isArray(raw) || raw.some(value => typeof value !== 'string' || !BLOCKERS.has(value))) invalid()
  
return [...new Set(raw as string[])]
}

function record(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) invalid()
  
return raw as Record<string, unknown>
}

function iso(raw: unknown) {
  if (typeof raw !== 'string' || !Number.isFinite(Date.parse(raw))) invalid()
  
return new Date(raw).toISOString()
}

function finite(raw: unknown) {
  if (typeof raw !== 'number' || !Number.isSafeInteger(raw)) invalid()
  
return raw
}

function nonNegative(raw: unknown) {
  const value = finite(raw)

  if (value < 0) invalid()
  
return value
}

function positive(raw: unknown) {
  const value = nonNegative(raw)

  if (value === 0) invalid()
  
return value
}

function boolean(raw: unknown) {
  if (typeof raw !== 'boolean') invalid()
  
return raw
}

function oneOf<const T extends readonly string[]>(raw: unknown, values: T): T[number] {
  if (typeof raw !== 'string' || !values.includes(raw)) invalid()
  
return raw as T[number]
}

function invalid(): never {
  throw new GlobeCreditCapacityStatusError()
}
