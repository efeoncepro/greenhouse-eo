import 'server-only'

import { CompiledQuery, type Transaction } from 'kysely'

import type { query } from '@/lib/db'
import type { DB } from '@/types/db'

import { ApiPlatformError } from './errors'
import {
  claimCommandExecution, completeCommandExecution, computeRequestFingerprint, incrementReplayCount,
  loadCommandExecutionByKey, resolveIdempotencyDecision, IDEMPOTENCY_TTL_MS,
  type CommandExecutionPrincipal, type CommandExecutionScope
} from './idempotency'

/** Use the existing idempotency store on the SAME transaction as the domain mutation. */
export const transactionalCommandQuery = (tx: Transaction<DB>): typeof query =>
  async <T extends Record<string, unknown>>(text: string, values: unknown[] = []) =>
    (await tx.executeQuery<T>(CompiledQuery.raw(text, values))).rows

export const executeAtomicApiPlatformCommand = async <T>({
  tx, principal, scope, routeKey, idempotencyKey, body, run
}: {
  tx: Transaction<DB>
  principal: CommandExecutionPrincipal
  scope: CommandExecutionScope
  routeKey: string
  idempotencyKey: string
  body: unknown
  run: (operationId: string) => Promise<T>
}): Promise<{ data: T; replayed: boolean }> => {
  const executeQuery = transactionalCommandQuery(tx)
  const path = `/${routeKey}`
  const fingerprint = computeRequestFingerprint({ method: 'POST', path, body })

  const claim = await claimCommandExecution({
    principal, scope, routeKey, method: 'POST', path, idempotencyKey, fingerprint,
    expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_MS)
  }, executeQuery)

  if (!claim.claimed) {
    const decision = resolveIdempotencyDecision(await loadCommandExecutionByKey({ principalId: principal.principalId, idempotencyKey }, executeQuery), fingerprint)

    if (decision.kind !== 'replay') throw new ApiPlatformError('Command key conflicts with an existing request.', {
      statusCode: 409, errorCode: decision.kind === 'in_progress' ? 'idempotency_in_progress' : 'idempotency_conflict'
    })

    await incrementReplayCount({ principalId: principal.principalId, idempotencyKey }, executeQuery)

    return { data: decision.responseBody as T, replayed: true }
  }

  const data = await run(claim.commandExecutionId!)

  await completeCommandExecution({ commandExecutionId: claim.commandExecutionId!, responseStatus: 200, responseBody: data }, executeQuery)

  // Any error, including response persistence, rolls back the claim and the domain effects together.
  return { data, replayed: false }
}
