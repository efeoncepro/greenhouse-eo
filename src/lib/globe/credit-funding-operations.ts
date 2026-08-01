import 'server-only'

import { randomUUID } from 'node:crypto'

import { query } from '@/lib/db'

import { createGreenhouseGlobeClient, type GreenhouseGlobeClientDependencies } from './client'

const READERS = {
  operation: 'globe.credits.funding.operation.get',
  operations: 'globe.credits.funding.operation.list'
} as const

const RECONCILE_COMMAND = 'globe.credits.funding.operation.reconcile'

const STATES = new Set([
  'proposed', 'confirmed', 'completed', 'expired', 'confirm_failed', 'outcome_unknown', 'reconciled'
])

const OUTCOMES = new Set(['completed', 'expired', 'no_effect', 'outcome_unknown'])

export type GlobeCreditFundingOperation = Readonly<{
  schemaVersion: '1'
  operationId: string
  proposalId: string
  state: string
  plan: Readonly<{
    poolId: string
    grantCredits: number
    monthlyCapAfter?: number
    monthlyCapBefore: number
    spentInPeriod: number
    policyAvailableBefore: number
    policyAvailableAfter: number
    periodStart: string
    periodEnd: string
  }>
  receipt?: Readonly<{
    outcome: string
    reconciledAt?: string
    reasonCode?: string
  }>
  expiresAt: string
  createdAt: string
  updatedAt: string
}>

export type GlobeCreditFundingOperationPage = Readonly<{
  schemaVersion: '1'
  items: readonly GlobeCreditFundingOperation[]
  nextCursor?: string
}>

export type GreenhouseCreditFundingIntentEvidence = Readonly<{
  phase: 'proposed' | 'confirmed' | 'completed' | 'confirm_failed'
  actorUserId: string
  actorEntitlement: string
  actorAuthMode: string
  correlationId: string
  createdAt: string
}>

type IntentEvidenceRow = Readonly<{
  proposal_id: string
  phase: GreenhouseCreditFundingIntentEvidence['phase']
  actor_user_id: string
  actor_entitlement: string
  actor_auth_mode: string
  correlation_id: string
  created_at: string | Date
}>

export type CreditFundingIntentQuery = <T extends Record<string, unknown>>(
  text: string,
  values?: unknown[]
) => Promise<T[]>

export class GlobeCreditFundingOperationError extends Error {
  readonly code: 'invalid_projection'

  constructor() {
    super('invalid_projection')
    this.name = 'GlobeCreditFundingOperationError'
    this.code = 'invalid_projection'
  }
}

export async function getGlobeCreditFundingOperation(input: Readonly<{
  globeWorkspaceId: string
  operationId: string
  correlationId?: string
}>, dependencies: GreenhouseGlobeClientDependencies = {}): Promise<GlobeCreditFundingOperation> {
  const { client } = createGreenhouseGlobeClient(process.env, dependencies)

  const result = await client.dispatchReader<unknown>(READERS.operation, { operationId: input.operationId }, {
    workspaceId: input.globeWorkspaceId,
    correlationId: input.correlationId ?? randomUUID()
  })

  return parseGlobeCreditFundingOperation(result.data)
}

export async function listGlobeCreditFundingOperations(input: Readonly<{
  globeWorkspaceId: string
  limit?: number
  state?: string
  cursor?: string
  correlationId?: string
}>, dependencies: GreenhouseGlobeClientDependencies = {}): Promise<GlobeCreditFundingOperationPage> {
  const { client } = createGreenhouseGlobeClient(process.env, dependencies)

  const result = await client.dispatchReader<unknown>(READERS.operations, {
    ...(input.limit === undefined ? {} : { limit: input.limit }),
    ...(input.state ? { state: input.state } : {}),
    ...(input.cursor ? { cursor: input.cursor } : {})
  }, {
    workspaceId: input.globeWorkspaceId,
    correlationId: input.correlationId ?? randomUUID()
  })

  return parseGlobeCreditFundingOperationPage(result.data)
}

export async function reconcileGlobeCreditFundingOperation(input: Readonly<{
  globeWorkspaceId: string
  operationId: string
  idempotencyKey: string
  correlationId?: string
}>, dependencies: GreenhouseGlobeClientDependencies = {}): Promise<GlobeCreditFundingOperation> {
  const { client } = createGreenhouseGlobeClient(process.env, dependencies)

  const result = await client.dispatchCommand<unknown>(RECONCILE_COMMAND, { operationId: input.operationId }, {
    workspaceId: input.globeWorkspaceId,
    idempotencyKey: input.idempotencyKey,
    correlationId: input.correlationId ?? randomUUID()
  })

  return parseGlobeCreditFundingOperation(result.outcome)
}

export function isGlobeCreditFundingOperationState(value: string | undefined): value is string {
  return value !== undefined && STATES.has(value)
}

/** Greenhouse provenance complements the authoritative Globe outcome; it never decides operation state. */
export async function readGreenhouseCreditFundingIntentEvidence(
  globeWorkspaceId: string,
  proposalIds: readonly string[],
  runQuery: CreditFundingIntentQuery = query
): Promise<ReadonlyMap<string, readonly GreenhouseCreditFundingIntentEvidence[]>> {
  const unique = [...new Set(proposalIds.filter(value => value.length > 0))]

  if (unique.length === 0) return new Map()

  const rows = await runQuery<IntentEvidenceRow>(
    `SELECT proposal_id, phase, actor_user_id, actor_entitlement, actor_auth_mode,
            correlation_id, created_at
       FROM greenhouse_core.globe_credit_funding_intents
      WHERE globe_workspace_id = $1 AND proposal_id = ANY($2::text[])
      ORDER BY created_at ASC, intent_id ASC`,
    [globeWorkspaceId, unique]
  )

  const result = new Map<string, GreenhouseCreditFundingIntentEvidence[]>()

  for (const row of rows) {
    if (!unique.includes(row.proposal_id) || !['proposed', 'confirmed', 'completed', 'confirm_failed'].includes(row.phase)) {
      invalid()
    }

    const evidence = {
      phase: row.phase,
      actorUserId: bounded(row.actor_user_id),
      actorEntitlement: bounded(row.actor_entitlement),
      actorAuthMode: bounded(row.actor_auth_mode),
      correlationId: bounded(row.correlation_id),
      createdAt: iso(row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at)
    } as const

    result.set(row.proposal_id, [...(result.get(row.proposal_id) ?? []), evidence])
  }

  
return result
}

export function parseGlobeCreditFundingOperationPage(raw: unknown): GlobeCreditFundingOperationPage {
  const value = record(raw)

  if (value.schemaVersion !== '1' || !Array.isArray(value.items)) invalid()
  const nextCursor = value.nextCursor === undefined ? undefined : bounded(value.nextCursor, 4096)

  
return {
    schemaVersion: '1',
    items: value.items.map(parseGlobeCreditFundingOperation),
    ...(nextCursor ? { nextCursor } : {})
  }
}

export function parseGlobeCreditFundingOperation(raw: unknown): GlobeCreditFundingOperation {
  const value = record(raw)

  if (value.schemaVersion !== '1') invalid()
  const state = bounded(value.state)

  if (!STATES.has(state)) invalid()
  const rawPlan = record(value.plan)

  if (rawPlan.schemaVersion !== '1') invalid()
  const rawReceipt = value.receipt === undefined ? undefined : record(value.receipt)

  if (rawReceipt && (rawReceipt.schemaVersion !== '1' || !OUTCOMES.has(bounded(rawReceipt.outcome)))) invalid()

  return {
    schemaVersion: '1',
    operationId: bounded(value.operationId),
    proposalId: bounded(value.proposalId),
    state,
    plan: {
      poolId: bounded(rawPlan.poolId),
      grantCredits: positive(rawPlan.grantCredits),
      ...(rawPlan.monthlyCapAfter === undefined ? {} : { monthlyCapAfter: nonNegative(rawPlan.monthlyCapAfter) }),
      monthlyCapBefore: nonNegative(rawPlan.monthlyCapBefore),
      spentInPeriod: nonNegative(rawPlan.spentInPeriod),
      policyAvailableBefore: nonNegative(rawPlan.policyAvailableBefore),
      policyAvailableAfter: nonNegative(rawPlan.policyAvailableAfter),
      periodStart: iso(rawPlan.periodStart),
      periodEnd: iso(rawPlan.periodEnd)
    },
    ...(rawReceipt ? { receipt: {
      outcome: bounded(rawReceipt.outcome),
      ...(rawReceipt.reconciledAt === undefined ? {} : { reconciledAt: iso(rawReceipt.reconciledAt) }),
      ...(rawReceipt.reasonCode === undefined ? {} : { reasonCode: bounded(rawReceipt.reasonCode) })
    } } : {}),
    expiresAt: iso(value.expiresAt),
    createdAt: iso(value.createdAt),
    updatedAt: iso(value.updatedAt)
  }
}

function record(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) invalid()
  
return raw as Record<string, unknown>
}

function bounded(raw: unknown, max = 512): string {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > max) invalid()
  
return raw
}

function iso(raw: unknown): string {
  const value = bounded(raw)

  if (!Number.isFinite(Date.parse(value))) invalid()
  
return new Date(value).toISOString()
}

function nonNegative(raw: unknown): number {
  if (typeof raw !== 'number' || !Number.isSafeInteger(raw) || raw < 0) invalid()
  
return raw
}

function positive(raw: unknown): number {
  const value = nonNegative(raw)

  if (value === 0) invalid()
  
return value
}

function invalid(): never {
  throw new GlobeCreditFundingOperationError()
}
