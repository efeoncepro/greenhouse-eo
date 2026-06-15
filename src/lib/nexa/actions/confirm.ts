import 'server-only'

import { executeApiPlatformCommand } from '@/lib/api-platform/core/commands'
import { ApiPlatformError } from '@/lib/api-platform/core/errors'

import { isNexaActionRuntimeEnabled } from '../flags'
import { getNexaActionDefinition } from './registry'
import type { NexaActionContext, NexaActionExecutionResult } from './types'

/**
 * TASK-1137 — Human confirmation → governed execution.
 *
 * This is the ONLY path that mutates. It re-validates the action deterministically AT EXECUTE TIME
 * (existence + runtime flag + per-action allowlist + permission) — never trusting that the proposal
 * the human saw is still valid — and then runs the bound command inside the API Platform
 * command/idempotency foundation (TASK-655) with `principalKind='app_user'`. The LLM never reaches
 * this function; only the human-triggered confirm endpoint does.
 */
export type NexaActionConfirmGapReason = 'unknown_action' | 'runtime_disabled' | 'not_permitted'

export type NexaActionConfirmOutcome =
  | { kind: 'executed'; result: NexaActionExecutionResult; replayed: boolean }
  | { kind: 'gap'; reason: NexaActionConfirmGapReason }
  | { kind: 'conflict' }

export const confirmNexaAction = async ({
  actionKey,
  context,
  idempotencyKey,
  request
}: {
  actionKey: string
  context: NexaActionContext
  idempotencyKey: string
  request: Request
}): Promise<NexaActionConfirmOutcome> => {
  const definition = getNexaActionDefinition(actionKey)

  if (!definition) return { kind: 'gap', reason: 'unknown_action' }

  // Re-check the gates at execute time (defense in depth — the proposal may be stale or the flag
  // may have flipped since it was shown). NEVER execute on a disabled/unpermitted action.
  if (!isNexaActionRuntimeEnabled() || !definition.isEnabled()) return { kind: 'gap', reason: 'runtime_disabled' }
  if (!definition.isPermitted(context)) return { kind: 'gap', reason: 'not_permitted' }

  try {
    const success = await executeApiPlatformCommand<NexaActionExecutionResult>({
      principal: {
        lane: 'app',
        principalKind: 'app_user',
        principalId: context.userId,
        userId: context.userId
      },
      scope: {
        greenhouseScopeType: context.tenantType === 'client' ? 'client' : 'internal',
        clientId: context.clientId
      },
      routeKey: `nexa.action.${actionKey}`,
      request,
      body: { actionKey },
      // The proposal's server-generated key scopes idempotency: a double-confirm replays the stored
      // result instead of re-running the command.
      idempotencyKeyOverride: idempotencyKey,
      run: async () => {
        const result = await definition.execute(context)

        return { data: result, status: 200 }
      }
    })

    return {
      kind: 'executed',
      result: success.data,
      replayed: success.headers?.['idempotency-replayed'] === 'true'
    }
  } catch (error) {
    // 409 from the idempotency foundation: in-progress or payload conflict. Not a server fault.
    if (error instanceof ApiPlatformError && error.statusCode === 409) {
      return { kind: 'conflict' }
    }

    throw error
  }
}
