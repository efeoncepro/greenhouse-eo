import 'server-only'

// TASK-535: Party Lifecycle types.
//
// These mirror the check constraints installed by the DDL migration
// (20260421113910459_task-535-organization-lifecycle-ddl). Do not drift the TS
// union from the SQL CHECK — add a new entry here AND in the migration.

export const LIFECYCLE_STAGES = [
  'prospect',
  'opportunity',
  'active_client',
  'inactive',
  'churned',
  'provider_only',
  'disqualified'
] as const

export type LifecycleStage = (typeof LIFECYCLE_STAGES)[number]

export const LIFECYCLE_TRANSITION_SOURCES = [
  'bootstrap',
  'hubspot_sync',
  'manual',
  'auto_sweep',
  'quote_converted',
  'deal_won',
  'contract_created',
  'deal_lost_sweep',
  'inactivity_sweep',
  'operator_override'
] as const

export type LifecycleTransitionSource = (typeof LIFECYCLE_TRANSITION_SOURCES)[number]

export type LifecycleTriggerEntityType = 'deal' | 'quote' | 'contract' | 'manual'

export interface LifecycleTriggerEntity {
  type: LifecycleTriggerEntityType
  id: string
}

export interface PartyActor {
  userId?: string
  system?: boolean
  reason?: string
  roleCodes?: readonly string[]
}

export interface PromoteDirection {

  /**
   * `demote` when the transition moves the party backwards in the commercial
   * funnel (e.g. `opportunity → prospect` on lost-all-deals). The default
   * undefined means a forward promotion.
   */
  direction?: 'promote' | 'demote'
}

export interface PartyPromotionResult {
  organizationId: string
  commercialPartyId: string
  fromStage: LifecycleStage | null
  toStage: LifecycleStage
  transitionedAt: string
  historyId: string
}

export interface PartyCreationResult {
  organizationId: string
  commercialPartyId: string
  lifecycleStage: LifecycleStage

  /** True when a new organization row was inserted; false on idempotent hit. */
  created: boolean
}

export interface ClientInstantiationResult {
  clientId: string
  clientProfileId: string
  organizationId: string
  commercialPartyId: string
}

// ── Error classes ───────────────────────────────────────────────────────────
// Mirror the naming convention used by Finance/HR modules.

export class PartyLifecycleError extends Error {
  code: string
  statusCode: number
  details?: unknown

  constructor(code: string, message: string, statusCode = 400, details?: unknown) {
    super(message)
    this.name = 'PartyLifecycleError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
  }
}

export class InvalidTransitionError extends PartyLifecycleError {
  constructor(from: LifecycleStage | null, to: LifecycleStage) {
    super(
      'INVALID_TRANSITION',
      `Lifecycle transition ${from ?? 'null'} → ${to} is not allowed by the state machine.`,
      422,
      { from, to }
    )
    this.name = 'InvalidTransitionError'
  }
}

export class OrganizationNotFoundError extends PartyLifecycleError {
  constructor(organizationId: string) {
    super('ORGANIZATION_NOT_FOUND', `Organization ${organizationId} does not exist.`, 404, { organizationId })
    this.name = 'OrganizationNotFoundError'
  }
}

export class OrganizationAlreadyHasClientError extends PartyLifecycleError {
  constructor(organizationId: string, clientId: string) {
    super(
      'ORGANIZATION_ALREADY_HAS_CLIENT',
      `Organization ${organizationId} already has client ${clientId}; refuse to double-instantiate.`,
      409,
      { organizationId, clientId }
    )
    this.name = 'OrganizationAlreadyHasClientError'
  }
}

export class InsufficientPermissionsError extends PartyLifecycleError {
  constructor(requiredCapability: string, actor: PartyActor) {
    super(
      'INSUFFICIENT_PERMISSION',
      `Actor lacks required capability: ${requiredCapability}.`,
      403,
      { requiredCapability, actor: { userId: actor.userId, system: actor.system } }
    )
    this.name = 'InsufficientPermissionsError'
  }
}
