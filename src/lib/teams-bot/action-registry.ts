import 'server-only'

import type { TenantAccessRecord } from '@/lib/tenant/access'

/**
 * TASK-671 — Action.Submit registry for Greenhouse Teams bot.
 *
 * Adaptive Cards posted by the bot may include `Action.Submit` buttons. When a user
 * clicks a button in Teams, the Bot Framework POSTs an `invoke` activity to
 * `/api/teams-bot/messaging` containing `{ data: { actionId: 'finance.expense.approve', … } }`.
 *
 * The endpoint validates the JWT, resolves the principal via `aadObjectId`, and then
 * dispatches the action through this registry. Each handler is responsible for:
 *  - Verifying entitlements / role gates
 *  - Executing idempotently (the bot may retry transient errors)
 *  - Returning a result the endpoint can surface back as a card update
 *
 * The pattern mirrors `src/lib/sync/projection-registry.ts` but lives separately so the
 * notifications dispatcher cannot accidentally execute action handlers.
 */

export interface TeamsBotActionContext {
  tenantContext: TenantAccessRecord
  /** Microsoft Graph user id of whoever clicked. */
  aadObjectId: string
  /** Greenhouse member_id resolved from the tenant context. May be null. */
  memberId: string | null
  /** Conversation id (channel/chat) the action was triggered from. */
  conversationId: string
  /** Activity id of the originating Adaptive Card. */
  activityId: string
}

export type TeamsBotActionResult =
  | {
      ok: true
      /**
       * Optional public-facing message the endpoint can surface as ephemeral text or
       * card update ("✓ Aprobado por Julio el 2026-04-26 14:32").
       */
      message?: string
      /** Optional updated card to replace the original. */
      updatedCardJson?: unknown
    }
  | {
      ok: false
      reason: 'missing_capability' | 'missing_role' | 'invalid_data' | 'execution_failed'
      message: string
    }

export interface TeamsBotActionDefinition<TData = Record<string, unknown>> {
  /** Stable action id used both server-side (registry) and client-side (Action.Submit data). */
  actionId: string
  /** Human description used by docs / dashboards. */
  description: string
  /** Functional domain ('ops' | 'finance' | 'delivery' | 'people' | 'platform'). */
  domain: 'ops' | 'finance' | 'delivery' | 'people' | 'platform'
  /** Optional list of required role codes. The principal must have ALL of them. */
  requiredRoleCodes?: string[]
  /**
   * Optional list of required route groups. The principal must be in ALL of them.
   * Use this for blanket access (e.g. "must have hr route group"); for fine-grained
   * checks the handler should call `getTenantEntitlements()` itself.
   */
  requiredRouteGroups?: string[]
  /** Validate the `data` payload from the Action.Submit. Throw or return false to reject. */
  validateData?: (data: unknown) => data is TData
  /** Idempotent handler. Receives validated data + tenant context. */
  handler: (data: TData, ctx: TeamsBotActionContext) => Promise<TeamsBotActionResult>
}

const registry = new Map<string, TeamsBotActionDefinition<unknown>>()

export const registerTeamsBotAction = <TData>(definition: TeamsBotActionDefinition<TData>): void => {
  if (registry.has(definition.actionId)) {
    throw new Error(`Duplicate teams bot action id: ${definition.actionId}`)
  }

  registry.set(definition.actionId, definition as unknown as TeamsBotActionDefinition<unknown>)
}

export const getTeamsBotAction = (actionId: string): TeamsBotActionDefinition<unknown> | null => {
  return registry.get(actionId) || null
}

export const listTeamsBotActions = (): readonly TeamsBotActionDefinition<unknown>[] => {
  return Array.from(registry.values())
}

const checkAuthorization = (
  definition: TeamsBotActionDefinition<unknown>,
  ctx: TeamsBotActionContext
): TeamsBotActionResult | null => {
  const requiredRoles = definition.requiredRoleCodes || []

  if (requiredRoles.length > 0) {
    const principalRoles = new Set(ctx.tenantContext.roleCodes || [])
    const missing = requiredRoles.filter(role => !principalRoles.has(role))

    if (missing.length) {
      return {
        ok: false,
        reason: 'missing_role',
        message: `Esta acción requiere los roles: ${missing.join(', ')}`
      }
    }
  }

  const requiredGroups = definition.requiredRouteGroups || []

  if (requiredGroups.length > 0) {
    const principalGroups = new Set(ctx.tenantContext.routeGroups || [])
    const missing = requiredGroups.filter(group => !principalGroups.has(group))

    if (missing.length) {
      return {
        ok: false,
        reason: 'missing_capability',
        message: `Esta acción requiere acceso al módulo: ${missing.join(', ')}`
      }
    }
  }

  return null
}

export const dispatchTeamsBotAction = async (
  actionId: string,
  data: unknown,
  ctx: TeamsBotActionContext
): Promise<TeamsBotActionResult> => {
  const definition = getTeamsBotAction(actionId)

  if (!definition) {
    return {
      ok: false,
      reason: 'invalid_data',
      message: `Acción desconocida: ${actionId}`
    }
  }

  const authError = checkAuthorization(definition, ctx)

  if (authError) return authError

  if (definition.validateData && !definition.validateData(data)) {
    return {
      ok: false,
      reason: 'invalid_data',
      message: `Payload inválido para la acción ${actionId}`
    }
  }

  try {
    return await definition.handler(data, ctx)
  } catch (error) {
    return {
      ok: false,
      reason: 'execution_failed',
      message: error instanceof Error ? error.message : String(error)
    }
  }
}

/** Test-only: clear all registered actions. */
export const __resetTeamsBotActionRegistry = () => {
  registry.clear()
}
