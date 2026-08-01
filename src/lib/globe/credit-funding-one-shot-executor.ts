import 'server-only'

import { createHash, randomUUID } from 'node:crypto'

import {
  confirmGlobeCreditFunding,
  ensureGlobeCreditFundingPlan,
  GlobeCreditFundingBrokerError,
  type GlobeCreditFundingActor
} from './credit-administration-broker'
import {
  getGlobeCreditFundingOperation,
  reconcileGlobeCreditFundingOperation,
  type GlobeCreditFundingOperation
} from './credit-funding-operations'
import {
  GlobeCreditFundingAuthorityError,
  GlobeCreditFundingOneShotAuthorityStore,
  type GlobeCreditFundingAuthorityExecution
} from './credit-funding-one-shot-authority'
import type { GreenhouseGlobeClientDependencies } from './client'

const ENSURE_ENTITLEMENT = 'platform.globe_credit_funding.ensure'

export type ExecuteOneShotGlobeCreditFundingInput = Readonly<{
  authorityId: string
  executorUserId: string
  executorOauthClientId: string
  oauthAccessTokenId: string
  actorAuthMode: string
  correlationId: string
  allowedGlobeWorkspaceIds: readonly string[]
}>

export type ExecuteOneShotGlobeCreditFundingResult = Readonly<{
  authorityId: string
  execution: GlobeCreditFundingAuthorityExecution
  outcome: 'completed' | 'no_effect' | 'outcome_unknown'
  operationId?: string
}>

type ExecutorDependencies = Readonly<{
  store?: GlobeCreditFundingOneShotAuthorityStore
  globe?: GreenhouseGlobeClientDependencies
}>

/**
 * Ejecuta una instrucción exacta una sola vez. Los reintentos reclaman la misma ejecución y usan
 * las mismas claves; si la confirmación queda ambigua, primero leen o reconcilian Globe.
 */
export async function executeOneShotGlobeCreditFunding(
  input: ExecuteOneShotGlobeCreditFundingInput,
  dependencies: ExecutorDependencies = {}
): Promise<ExecuteOneShotGlobeCreditFundingResult> {
  const store = dependencies.store ?? new GlobeCreditFundingOneShotAuthorityStore()
  const claimed = await store.claim(input)
  const workspaceId = claimed.authority.globeWorkspaceId

  const actor: GlobeCreditFundingActor = {
    userId: input.executorUserId,
    entitlement: ENSURE_ENTITLEMENT,
    authMode: input.actorAuthMode
  }

  const authorityEvidence = {
    authorityId: claimed.authority.authorityId,
    executionId: claimed.execution.executionId
  }

  let current = claimed.execution

  if (isTerminal(current)) return asResult(current)

  if (current.state === 'claimed') {
    const planned = await ensureGlobeCreditFundingPlan(
      {
        globeWorkspaceId: workspaceId,
        targetAvailableCredits: claimed.authority.targetAvailableCredits,
        maxGrantCredits: claimed.authority.maxGrantCredits,
        maxResultingCapCredits: claimed.authority.maxResultingCapCredits,
        periodStart: claimed.authority.periodStart,
        periodEnd: claimed.authority.periodEnd,
        actor,
        idempotencyKey: current.proposeIdempotencyKey,
        correlationId: input.correlationId,
        authority: authorityEvidence
      },
      dependencies.globe
    )

    if (planned.status === 'already_funded') {
      current = await store.advance({
        executionId: current.executionId,
        expectedState: 'claimed',
        state: 'completed',
        oauthAccessTokenId: input.oauthAccessTokenId,
        correlationId: input.correlationId,
        outcome: 'no_effect',
        globeOperationId: planned.operation.operationId,
        receiptDigest: digest(planned.operation.receipt ?? planned.operation)
      })

      return asResult(current)
    }

    current = await store.advance({
      executionId: current.executionId,
      expectedState: 'claimed',
      state: 'proposed',
      oauthAccessTokenId: input.oauthAccessTokenId,
      correlationId: input.correlationId,
      proposalId: planned.proposalId,
      planFingerprint: planned.fingerprint,
      globeOperationId: planned.proposalId
    })
  }

  if (!current.proposalId || !current.planFingerprint) {
    throw new GlobeCreditFundingAuthorityError('invalid_transition')
  }

  const proposalId = current.proposalId
  const planFingerprint = current.planFingerprint
  const leaseOwnerId = randomUUID()

  if (current.state === 'outcome_unknown') {
    current = await store.acquireDispatchLease({
      executionId: current.executionId,
      leaseOwnerId,
      oauthAccessTokenId: input.oauthAccessTokenId,
      correlationId: input.correlationId
    })

    return recoverUnknown({ input, current, workspaceId, leaseOwnerId, store, globe: dependencies.globe })
  }

  let enteredConfirming = false

  if (current.state === 'proposed') {
    current = await store.advance({
      executionId: current.executionId,
      expectedState: 'proposed',
      state: 'confirming',
      oauthAccessTokenId: input.oauthAccessTokenId,
      correlationId: input.correlationId
    })
    enteredConfirming = true
  }

  if (current.state !== 'confirming') throw new GlobeCreditFundingAuthorityError('invalid_transition')
  current = await store.acquireDispatchLease({
    executionId: current.executionId,
    leaseOwnerId,
    oauthAccessTokenId: input.oauthAccessTokenId,
    correlationId: input.correlationId
  })

  if (!enteredConfirming) {
    const observed = await getGlobeCreditFundingOperation(
      {
        globeWorkspaceId: workspaceId,
        operationId: proposalId,
        correlationId: input.correlationId
      },
      dependencies.globe
    )

    const recovered = await settleObserved({
      input,
      current,
      observed,
      workspaceId,
      leaseOwnerId,
      store,
      globe: dependencies.globe
    })

    if (recovered) return recovered
  }

  try {
    const outcome = await confirmGlobeCreditFunding(
      {
        globeWorkspaceId: workspaceId,
        proposalId,
        fingerprint: planFingerprint,
        actor,
        idempotencyKey: current.confirmIdempotencyKey,
        correlationId: input.correlationId,
        authority: authorityEvidence
      },
      dependencies.globe
    )

    current = await store.advance({
      executionId: current.executionId,
      expectedState: 'confirming',
      state: 'completed',
      oauthAccessTokenId: input.oauthAccessTokenId,
      correlationId: input.correlationId,
      globeOperationId: proposalId,
      outcome: 'completed',
      receiptDigest: digest(outcome),
      leaseOwnerId,
      leaseGeneration: requiredLeaseGeneration(current)
    })

    return asResult(current)
  } catch (error) {
    if (error instanceof GlobeCreditFundingBrokerError && error.code === 'globe_unavailable') {
      await store.advance({
        executionId: current.executionId,
        expectedState: 'confirming',
        state: 'outcome_unknown',
        oauthAccessTokenId: input.oauthAccessTokenId,
        correlationId: input.correlationId,
        globeOperationId: proposalId,
        outcome: 'outcome_unknown',
        leaseOwnerId,
        leaseGeneration: requiredLeaseGeneration(current)
      })
    } else if (error instanceof GlobeCreditFundingBrokerError && error.code === 'rejected_by_globe') {
      const observed = await getGlobeCreditFundingOperation(
        {
          globeWorkspaceId: workspaceId,
          operationId: proposalId,
          correlationId: input.correlationId
        },
        dependencies.globe
      )

      const recovered = await settleObserved({
        input,
        current,
        observed,
        workspaceId,
        leaseOwnerId,
        store,
        globe: dependencies.globe
      })

      if (recovered) return recovered

      await store.advance({
        executionId: current.executionId,
        expectedState: 'confirming',
        state: 'failed_definitive',
        oauthAccessTokenId: input.oauthAccessTokenId,
        correlationId: input.correlationId,
        leaseOwnerId,
        leaseGeneration: requiredLeaseGeneration(current)
      })
    }

    throw error
  }
}

async function recoverUnknown(
  args: Readonly<{
    input: ExecuteOneShotGlobeCreditFundingInput
    current: GlobeCreditFundingAuthorityExecution
    workspaceId: string
    leaseOwnerId: string
    store: GlobeCreditFundingOneShotAuthorityStore
    globe?: GreenhouseGlobeClientDependencies
  }>
): Promise<ExecuteOneShotGlobeCreditFundingResult> {
  const operation = await reconcileGlobeCreditFundingOperation(
    {
      globeWorkspaceId: args.workspaceId,
      operationId: args.current.proposalId!,
      idempotencyKey: args.current.reconcileIdempotencyKey,
      correlationId: args.input.correlationId
    },
    args.globe
  )

  const terminal = terminalOutcome(operation)

  if (!terminal) return asResult(args.current)

  const next = await args.store.advance({
    executionId: args.current.executionId,
    expectedState: 'outcome_unknown',
    state: 'reconciled',
    oauthAccessTokenId: args.input.oauthAccessTokenId,
    correlationId: args.input.correlationId,
    globeOperationId: operation.operationId,
    outcome: terminal,
    receiptDigest: digest(operation.receipt ?? operation),
    leaseOwnerId: args.leaseOwnerId,
    leaseGeneration: requiredLeaseGeneration(args.current)
  })

  return asResult(next)
}

async function settleObserved(
  args: Readonly<{
    input: ExecuteOneShotGlobeCreditFundingInput
    current: GlobeCreditFundingAuthorityExecution
    observed: GlobeCreditFundingOperation
    workspaceId: string
    leaseOwnerId: string
    store: GlobeCreditFundingOneShotAuthorityStore
    globe?: GreenhouseGlobeClientDependencies
  }>
): Promise<ExecuteOneShotGlobeCreditFundingResult | undefined> {
  const terminal = terminalOutcome(args.observed)

  if (terminal) {
    const next = await args.store.advance({
      executionId: args.current.executionId,
      expectedState: 'confirming',
      state: 'completed',
      oauthAccessTokenId: args.input.oauthAccessTokenId,
      correlationId: args.input.correlationId,
      globeOperationId: args.observed.operationId,
      outcome: terminal,
      receiptDigest: digest(args.observed.receipt ?? args.observed),
      leaseOwnerId: args.leaseOwnerId,
      leaseGeneration: requiredLeaseGeneration(args.current)
    })

    return asResult(next)
  }

  if (args.observed.state === 'expired' || args.observed.state === 'confirm_failed') {
    await args.store.advance({
      executionId: args.current.executionId,
      expectedState: 'confirming',
      state: 'failed_definitive',
      oauthAccessTokenId: args.input.oauthAccessTokenId,
      correlationId: args.input.correlationId,
      globeOperationId: args.observed.operationId,
      leaseOwnerId: args.leaseOwnerId,
      leaseGeneration: requiredLeaseGeneration(args.current)
    })
    throw new GlobeCreditFundingBrokerError('rejected_by_globe')
  }

  if (['confirmed', 'outcome_unknown', 'reconciled'].includes(args.observed.state)) {
    const operation = await reconcileGlobeCreditFundingOperation(
      {
        globeWorkspaceId: args.workspaceId,
        operationId: args.observed.operationId,
        idempotencyKey: args.current.reconcileIdempotencyKey,
        correlationId: args.input.correlationId
      },
      args.globe
    )

    const reconciled = terminalOutcome(operation)

    if (reconciled) {
      const next = await args.store.advance({
        executionId: args.current.executionId,
        expectedState: 'confirming',
        state: 'completed',
        oauthAccessTokenId: args.input.oauthAccessTokenId,
        correlationId: args.input.correlationId,
        globeOperationId: operation.operationId,
        outcome: reconciled,
        receiptDigest: digest(operation.receipt ?? operation),
        leaseOwnerId: args.leaseOwnerId,
        leaseGeneration: requiredLeaseGeneration(args.current)
      })

      return asResult(next)
    }

    const unknown = await args.store.advance({
      executionId: args.current.executionId,
      expectedState: 'confirming',
      state: 'outcome_unknown',
      oauthAccessTokenId: args.input.oauthAccessTokenId,
      correlationId: args.input.correlationId,
      globeOperationId: operation.operationId,
      outcome: 'outcome_unknown',
      receiptDigest: digest(operation.receipt ?? operation),
      leaseOwnerId: args.leaseOwnerId,
      leaseGeneration: requiredLeaseGeneration(args.current)
    })

    return asResult(unknown)
  }

  return undefined
}

function terminalOutcome(operation: GlobeCreditFundingOperation): 'completed' | 'no_effect' | undefined {
  if (operation.receipt?.outcome === 'completed') return 'completed'
  if (operation.receipt?.outcome === 'no_effect') return 'no_effect'

  return undefined
}

function isTerminal(execution: GlobeCreditFundingAuthorityExecution) {
  return ['completed', 'reconciled'].includes(execution.state)
}

function requiredLeaseGeneration(execution: GlobeCreditFundingAuthorityExecution) {
  if (!Number.isSafeInteger(execution.dispatchLeaseGeneration) || (execution.dispatchLeaseGeneration ?? 0) <= 0) {
    throw new GlobeCreditFundingAuthorityError('invalid_transition')
  }

  return execution.dispatchLeaseGeneration!
}

function asResult(execution: GlobeCreditFundingAuthorityExecution): ExecuteOneShotGlobeCreditFundingResult {
  return {
    authorityId: execution.authorityId,
    execution,
    outcome:
      execution.outcome === 'no_effect'
        ? 'no_effect'
        : execution.outcome === 'outcome_unknown'
          ? 'outcome_unknown'
          : 'completed',
    ...(execution.globeOperationId ? { operationId: execution.globeOperationId } : {})
  }
}

function digest(value: unknown) {
  return createHash('sha256')
    .update(JSON.stringify(value ?? null))
    .digest('hex')
}
