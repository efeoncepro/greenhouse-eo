import 'server-only'

import { randomUUID } from 'node:crypto'

import { ROLE_CODES } from '@/config/role-codes'

import { isNexaActionRuntimeEnabled } from '../flags'
import { markNotificationsReadAction } from './pilot-mark-notifications-read'
import {
  NEXA_ACTION_PROPOSAL_CONTRACT_VERSION,
  type NexaActionContext,
  type NexaActionDefinition,
  type NexaActionGap,
  type NexaActionProposal
} from './types'

/**
 * Structural shape both `NexaRuntimeContext` (tool) and `TenantContext` (endpoint) satisfy — so the
 * action context is built the same way from either entry point. Identity comes ONLY from session.
 */
export interface NexaActionContextSource {
  userId: string
  memberId?: string
  clientId: string | null
  tenantType: 'client' | 'efeonce_internal'
  roleCodes: string[]
  routeGroups: string[]
}

/**
 * Who may use the Nexa governed action runtime (mirror of the `nexa.action.execute` grant in
 * runtime.ts: internal route group ∪ EFEONCE_ADMIN). Pilot audience = internal users only; client
 * users are excluded until a domain pilot proves the boundary. The endpoint also enforces the
 * capability via `can()` — this is the synchronous gate for the tool's availability + the resolver.
 */
export const canUseNexaActionRuntime = (source: NexaActionContextSource): boolean =>
  source.routeGroups.includes('internal') ||
  source.routeGroups.includes('admin') ||
  source.roleCodes.includes(ROLE_CODES.EFEONCE_ADMIN)

/** Maps a session-derived source to the minimal action context. Identity comes ONLY from session. */
export const buildNexaActionContext = (source: NexaActionContextSource): NexaActionContext => ({
  userId: source.userId,
  memberId: source.memberId,
  clientId: source.clientId || null,
  tenantType: source.tenantType,
  roleCodes: source.roleCodes,
  routeGroups: source.routeGroups
})

/**
 * TASK-1137 — Deterministic registry of governed Nexa actions.
 *
 * The LLM can only PROPOSE an actionKey present in this map (via the `propose_action` tool); it can
 * never invent an endpoint, URL, or SQL. This registry is the single source of truth for what Nexa
 * is allowed to act on, what command each action binds to, and how each is gated. Adding a new
 * action is a code change reviewed by a human — never inferred from free text.
 */
const NEXA_ACTION_REGISTRY: Record<string, NexaActionDefinition> = {
  [markNotificationsReadAction.actionKey]: markNotificationsReadAction
}

export const getNexaActionDefinition = (actionKey: string): NexaActionDefinition | null =>
  NEXA_ACTION_REGISTRY[actionKey] ?? null

/** Action keys currently enabled (runtime flag ON + per-action allowlist). Used to hint the LLM. */
export const listEnabledNexaActionKeys = (): string[] => {
  if (!isNexaActionRuntimeEnabled()) return []

  return Object.values(NEXA_ACTION_REGISTRY)
    .filter(definition => definition.isEnabled())
    .map(definition => definition.actionKey)
}

export const buildNexaActionConfirmEndpoint = (actionKey: string): string =>
  `/api/nexa/actions/${encodeURIComponent(actionKey)}/confirm`

export type NexaActionResolution =
  | { kind: 'proposal'; proposal: NexaActionProposal; definition: NexaActionDefinition }
  | { kind: 'gap'; gap: NexaActionGap }

/**
 * The single deterministic point that turns an actionKey + session context into a governed proposal
 * or an honest gap. Validates enablement → permission → builds a fresh read-only preview. NEVER
 * mutates. Both the `propose_action` tool and the confirm endpoint resolve through here so the
 * gates can never diverge.
 */
export const resolveNexaActionProposal = async (
  actionKey: string,
  context: NexaActionContext
): Promise<NexaActionResolution> => {
  const definition = getNexaActionDefinition(actionKey)

  // Unknown key → the LLM proposed something that isn't a registered action. Honest gap, no endpoint.
  if (!definition) {
    return {
      kind: 'gap',
      gap: {
        reason: 'unknown_action',
        message: `No tengo una acción registrada llamada "${actionKey}", así que no puedo ejecutarla.`
      }
    }
  }

  // Master runtime flag + per-action allowlist (defense in depth; the tool also gates upstream).
  if (!isNexaActionRuntimeEnabled() || !definition.isEnabled()) {
    return {
      kind: 'gap',
      gap: {
        reason: 'runtime_disabled',
        message: 'Las acciones gobernadas de Nexa no están habilitadas en este momento.',
        deepLink: definition.deepLinkFallback
      }
    }
  }

  if (!definition.isPermitted(context)) {
    return {
      kind: 'gap',
      gap: {
        reason: 'not_permitted',
        message: 'No tienes permiso para ejecutar esta acción.',
        deepLink: definition.deepLinkFallback
      }
    }
  }

  const preview = await definition.buildPreview(context)

  const proposal: NexaActionProposal = {
    contractVersion: NEXA_ACTION_PROPOSAL_CONTRACT_VERSION,
    proposalId: `nexa-act-${randomUUID()}`,
    actionKey: definition.actionKey,
    intent: definition.intent,
    sensitivity: definition.sensitivity,
    preview,
    confirmation: definition.confirmation,
    execution: {
      confirmEndpoint: buildNexaActionConfirmEndpoint(definition.actionKey),
      // Server-generated idempotency key bound to this proposal instance. The UI echoes it on
      // confirm so a double-click replays instead of double-executing (TASK-655 foundation).
      idempotencyKey: `nexa-act-idem-${randomUUID()}`
    },
    expiresAt: new Date(Date.now() + definition.expirationSeconds * 1000).toISOString()
  }

  return { kind: 'proposal', proposal, definition }
}
