import 'server-only'

import type { ApiPlatformRequestContext, ApiPlatformSuccessResult } from './context'
import { runEcosystemReadRoute } from './ecosystem-auth'
import { ApiPlatformError, normalizeApiPlatformError } from './errors'
import {
  claimCommandExecution,
  completeCommandExecution,
  computeRequestFingerprint,
  failCommandExecution,
  IDEMPOTENCY_REPLAYED_HEADER,
  IDEMPOTENCY_TTL_MS,
  incrementReplayCount,
  loadCommandExecutionByKey,
  parseIdempotencyKey,
  recordCommandAudit,
  resolveIdempotencyDecision,
  type CommandExecutionPrincipal,
  type CommandExecutionScope
} from './idempotency'

// Shape persisted in response_body for a completed keyed command, used to rebuild the
// success result faithfully on replay.
type StoredCommandResponse<T> = {
  data: T
  meta?: Record<string, unknown> | null
  status?: number
}

const runOwnedExecution = async <T>({
  commandExecutionId,
  run
}: {
  commandExecutionId: string
  run: () => Promise<ApiPlatformSuccessResult<T>>
}): Promise<ApiPlatformSuccessResult<T>> => {
  let result: ApiPlatformSuccessResult<T>

  try {
    result = await run()
  } catch (error) {
    const normalized = normalizeApiPlatformError(error)

    // Mark this execution failed so a retry with the same Idempotency-Key is allowed.
    // Best-effort: never mask the real error behind an audit-write failure.
    await failCommandExecution({
      commandExecutionId,
      responseStatus: normalized.statusCode,
      errorCode: normalized.errorCode
    }).catch(() => undefined)

    throw error
  }

  const status = result.status ?? 200

  const storedResponse: StoredCommandResponse<T> = {
    data: result.data,
    meta: result.meta ?? null,
    status
  }

  // Best-effort: the command already succeeded; a failed audit write must not turn a
  // committed write into a client-visible error.
  await completeCommandExecution({
    commandExecutionId,
    responseStatus: status,
    responseBody: storedResponse
  }).catch(() => undefined)

  return result
}

/**
 * Idempotency + command-audit core. Runs the command handler exactly once per
 * (principal, Idempotency-Key) and audits every execution.
 *
 * - No key       → fresh audit row, run once, record outcome (no replay semantics).
 * - Keyed:
 *   - first call → claim, run, store response.
 *   - replay (same key + same payload, completed) → return stored response + replayed header.
 *   - in-flight (same key + same payload, processing) → 409 idempotency_in_progress.
 *   - conflict (same key, different payload) → 409 idempotency_conflict.
 *   - retry-after-failure (same key + same payload, failed) → re-claim, run again.
 */
export const executeApiPlatformCommand = async <T>({
  principal,
  scope,
  routeKey,
  request,
  body,
  run
}: {
  principal: CommandExecutionPrincipal
  scope: CommandExecutionScope
  routeKey: string
  request: Request
  body: unknown
  run: () => Promise<ApiPlatformSuccessResult<T>>
}): Promise<ApiPlatformSuccessResult<T>> => {
  const method = request.method.toUpperCase()
  const path = new URL(request.url).pathname
  const idempotencyKey = parseIdempotencyKey(request)
  const expiresAt = new Date(Date.now() + IDEMPOTENCY_TTL_MS)

  if (!idempotencyKey) {
    const commandExecutionId = await recordCommandAudit({ principal, scope, routeKey, method, path, expiresAt })

    return runOwnedExecution({ commandExecutionId, run })
  }

  const fingerprint = computeRequestFingerprint({ method, path, body })

  const claim = await claimCommandExecution({
    principal,
    scope,
    routeKey,
    method,
    path,
    idempotencyKey,
    fingerprint,
    expiresAt
  })

  if (claim.claimed && claim.commandExecutionId) {
    return runOwnedExecution({ commandExecutionId: claim.commandExecutionId, run })
  }

  const existing = await loadCommandExecutionByKey({ principalId: principal.principalId, idempotencyKey })
  const decision = resolveIdempotencyDecision(existing, fingerprint)

  if (decision.kind === 'replay') {
    await incrementReplayCount({ principalId: principal.principalId, idempotencyKey }).catch(() => undefined)

    const stored = (decision.responseBody ?? null) as StoredCommandResponse<T> | null

    return {
      data: (stored?.data ?? null) as T,
      meta: stored?.meta ?? undefined,
      status: stored?.status ?? decision.responseStatus,
      headers: { [IDEMPOTENCY_REPLAYED_HEADER]: 'true' }
    }
  }

  if (decision.kind === 'in_progress') {
    throw new ApiPlatformError('A command with this Idempotency-Key is already in progress.', {
      statusCode: 409,
      errorCode: 'idempotency_in_progress'
    })
  }

  throw new ApiPlatformError('Idempotency-Key was reused with a different request payload.', {
    statusCode: 409,
    errorCode: 'idempotency_conflict'
  })
}

/**
 * Command counterpart of `runEcosystemReadRoute`: same auth/binding/rate-limit/request-log
 * pipeline (reused, never duplicated), with idempotency + command audit layered around the
 * handler. Mutative ecosystem routes (POST/PATCH/DELETE) use this instead of the read helper.
 */
export const runEcosystemCommandRoute = async <T>({
  request,
  routeKey,
  body,
  handler
}: {
  request: Request
  routeKey: string
  body: unknown
  handler: (context: ApiPlatformRequestContext) => Promise<ApiPlatformSuccessResult<T>>
}) =>
  runEcosystemReadRoute({
    request,
    routeKey,
    handler: context =>
      executeApiPlatformCommand({
        principal: {
          lane: 'ecosystem',
          principalKind: 'consumer',
          principalId: context.consumer.consumerId,
          consumerId: context.consumer.consumerId
        },
        scope: {
          greenhouseScopeType: context.binding.greenhouseScopeType,
          organizationId: context.binding.organizationId,
          clientId: context.binding.clientId,
          spaceId: context.binding.spaceId
        },
        routeKey,
        request,
        body,
        run: () => handler(context)
      })
  })
