import 'server-only'

// TASK-539: types for the inline deal creation command + endpoint.
//
// Scope: Fase E of the Commercial Party Lifecycle program. The command
// `createDealFromQuoteContext` is the only legal write path for deals born
// inside Greenhouse (sync inbound from HubSpot remains the only source for
// deals originated there).

export const DEAL_CREATE_ATTEMPT_STATUSES = [
  'pending',
  'completed',
  'pending_approval',
  'rate_limited',
  'failed',
  'endpoint_not_deployed'
] as const

export type DealCreateAttemptStatus = (typeof DEAL_CREATE_ATTEMPT_STATUSES)[number]

/** Threshold that requires approval before the deal is sent to HubSpot. */
export const DEAL_CREATE_APPROVAL_THRESHOLD_CLP = 50_000_000

/** Per-user sliding window (seconds) + max attempts. */
export const DEAL_CREATE_RATE_LIMIT_USER_WINDOW_SECONDS = 60
export const DEAL_CREATE_RATE_LIMIT_USER_MAX = 20

/** Per-tenant sliding window (seconds) + max attempts. */
export const DEAL_CREATE_RATE_LIMIT_TENANT_WINDOW_SECONDS = 3_600
export const DEAL_CREATE_RATE_LIMIT_TENANT_MAX = 100

/** Fingerprint dedupe window when no explicit idempotency key is supplied. */
export const DEAL_CREATE_FINGERPRINT_WINDOW_SECONDS = 5 * 60

export interface DealActor {
  userId: string
  tenantScope: string
  businessLineCode?: string | null
}

export interface CreateDealFromQuoteContextInput {
  organizationId: string
  dealName: string
  amount?: number | null
  currency?: string | null
  amountClp?: number | null
  pipelineId?: string | null
  stageId?: string | null
  ownerHubspotUserId?: string | null
  closeDateHint?: string | null
  businessLineCode?: string | null
  quotationId?: string | null
  idempotencyKey?: string | null
  actor: DealActor
}

export interface CreateDealFromQuoteContextResult {
  attemptId: string
  status: DealCreateAttemptStatus
  dealId: string | null
  hubspotDealId: string | null
  organizationPromoted: boolean
  requiresApproval: boolean
  approvalId: string | null
  message: string

  /**
   * Resolved pipeline / stage / owner from the governance layer. Populated
   * once the command actually writes a deal (status='completed'); null for
   * pending_approval, endpoint_not_deployed, failed, or idempotent hits that
   * did not run the resolver.
   */
  pipelineUsed: string | null
  pipelineLabelUsed: string | null
  stageUsed: string | null
  stageLabelUsed: string | null
  ownerUsed: string | null
}

// ── Error classes ─────────────────────────────────────────────────────────

export class DealCreateError extends Error {
  code: string
  statusCode: number
  details?: unknown

  constructor(code: string, message: string, statusCode = 500, details?: unknown) {
    super(message)
    this.name = 'DealCreateError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
  }
}

export class DealCreateValidationError extends DealCreateError {
  constructor(message: string, details?: unknown) {
    super('DEAL_CREATE_VALIDATION', message, 400, details)
    this.name = 'DealCreateValidationError'
  }
}

export class OrganizationHasNoCompanyError extends DealCreateError {
  constructor(organizationId: string) {
    super(
      'ORGANIZATION_HAS_NO_HUBSPOT_COMPANY',
      `Organization ${organizationId} has no hubspot_company_id; cannot create a deal against HubSpot.`,
      409,
      { organizationId }
    )
    this.name = 'OrganizationHasNoCompanyError'
  }
}

export class DealCreateRateLimitError extends DealCreateError {
  retryAfterSeconds: number

  constructor(scope: 'user' | 'tenant', retryAfterSeconds: number, currentCount: number, max: number) {
    super(
      'DEAL_CREATE_RATE_LIMITED',
      `Rate limit exceeded for ${scope} scope: ${currentCount}/${max}. Retry in ${retryAfterSeconds}s.`,
      429,
      { scope, currentCount, max, retryAfterSeconds }
    )
    this.name = 'DealCreateRateLimitError'
    this.retryAfterSeconds = retryAfterSeconds
  }
}

export class DealCreateSelectionInvalidError extends DealCreateError {
  constructor(
    reason:
      | 'pipeline_unknown'
      | 'pipeline_inactive'
      | 'stage_unknown'
      | 'stage_not_in_pipeline'
      | 'stage_closed'
      | 'stage_not_selectable',
    detail: Record<string, unknown>
  ) {
    super(
      'DEAL_CREATE_SELECTION_INVALID',
      `Pipeline/stage selection is invalid: ${reason}`,
      422,
      { reason, ...detail }
    )
    this.name = 'DealCreateSelectionInvalidError'
  }
}

export class DealCreateContextEmptyError extends DealCreateError {
  constructor() {
    super(
      'DEAL_CREATE_CONTEXT_EMPTY',
      'No pipelines are configured for deal creation. Ask an administrator to seed greenhouse_commercial.hubspot_deal_pipeline_config.',
      409,
      { requiredRegistry: 'greenhouse_commercial.hubspot_deal_pipeline_config' }
    )
    this.name = 'DealCreateContextEmptyError'
  }
}

export class DealCreateInsufficientPermissionsError extends DealCreateError {
  constructor(userId: string) {
    super(
      'DEAL_CREATE_INSUFFICIENT_PERMISSIONS',
      `User ${userId} lacks capability commercial.deal.create.`,
      403,
      { userId, requiredCapability: 'commercial.deal.create' }
    )
    this.name = 'DealCreateInsufficientPermissionsError'
  }
}
