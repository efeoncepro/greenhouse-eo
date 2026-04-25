import 'server-only'

// TASK-541: types for the atomic quote-to-cash choreography.
//
// The command is the only legal path that composes quote → contract →
// client → party promotion → deal-won into a single transaction with
// rollback and a stable correlation_id for cross-aggregate audit.
//
// Drift between the TS unions below and the CHECK constraints in
// `20260421150625283_task-541-commercial-operations-audit.sql` will break
// the build on purpose — update both or neither.

export const CONVERT_QUOTE_TO_CASH_TRIGGERS = [
  /** Explicit operator invocation via API. */
  'operator',

  /** Reserved: reactive trigger when a contract is signed outside this command. */
  'contract_signed',

  /** Deal moved to closedwon via inbound HubSpot sync. */
  'deal_won_hubspot',

  /** Generic reactive / projection-originated trigger. */
  'reactive_auto'
] as const

export type ConversionTriggeredBy = (typeof CONVERT_QUOTE_TO_CASH_TRIGGERS)[number]

export const COMMERCIAL_OPERATION_STATUSES = [
  'started',
  'completed',
  'failed',
  'pending_approval',
  'idempotent_hit'
] as const

export type CommercialOperationStatus = (typeof COMMERCIAL_OPERATION_STATUSES)[number]

/** Threshold that forces a dual-approval gate before touching any downstream state. */
export const QUOTE_TO_CASH_DUAL_APPROVAL_THRESHOLD_CLP = 100_000_000

export interface ConvertQuoteToCashActor {
  userId: string
  tenantScope: string
  name?: string | null
}

export interface ConvertQuoteToCashInput {
  quotationId: string
  conversionTriggeredBy: ConversionTriggeredBy
  actor: ConvertQuoteToCashActor

  /**
   * When the trigger knows the HubSpot deal that initiated the conversion
   * (e.g. `deal_won_hubspot`), pass it so `deal_won` emission + audit linkage
   * stay coherent with the upstream event.
   */
  hubspotDealId?: string | null

  /**
   * Allow the caller to force execution even when the threshold would
   * normally gate the op. Reserved for the approval-resolved path.
   */
  skipApprovalGate?: boolean

  /**
   * Optional external correlation hint — when a parent flow already has a
   * correlation uuid, pass it through. Defaults to a fresh uuid.
   */
  correlationId?: string
}

export interface ConvertQuoteToCashResult {
  operationId: string
  correlationId: string
  status: CommercialOperationStatus
  quotationId: string
  contractId: string | null
  clientId: string | null
  organizationId: string | null
  hubspotDealId: string | null
  organizationPromoted: boolean
  clientInstantiated: boolean
  dealWonEmitted: boolean
  requiresApproval: boolean
  approvalId: string | null
  message: string
}

// ── Error classes ─────────────────────────────────────────────────────────

export class QuoteToCashError extends Error {
  code: string
  statusCode: number
  details?: unknown

  constructor(code: string, message: string, statusCode = 500, details?: unknown) {
    super(message)
    this.name = 'QuoteToCashError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
  }
}

export class QuotationNotFoundError extends QuoteToCashError {
  constructor(quotationId: string) {
    super('QUOTATION_NOT_FOUND', `Quotation ${quotationId} does not exist.`, 404, { quotationId })
    this.name = 'QuotationNotFoundError'
  }
}

export class QuotationNotConvertibleError extends QuoteToCashError {
  constructor(quotationId: string, status: string) {
    super(
      'QUOTATION_NOT_CONVERTIBLE',
      `Quotation ${quotationId} is in status '${status}'. Only 'issued', 'sent' or 'approved' quotes can enter quote-to-cash.`,
      409,
      { quotationId, status }
    )
    this.name = 'QuotationNotConvertibleError'
  }
}

export class QuoteToCashApprovalRequiredError extends QuoteToCashError {
  approvalId: string
  thresholdClp: number

  constructor(quotationId: string, amountClp: number, thresholdClp: number, approvalId: string) {
    super(
      'QUOTE_TO_CASH_APPROVAL_REQUIRED',
      `Quotation ${quotationId} total CLP ${amountClp.toLocaleString('es-CL')} exceeds threshold ${thresholdClp.toLocaleString('es-CL')}. Dual approval requested (${approvalId}).`,
      409,
      { quotationId, amountClp, thresholdClp, approvalId }
    )
    this.name = 'QuoteToCashApprovalRequiredError'
    this.approvalId = approvalId
    this.thresholdClp = thresholdClp
  }
}

export class QuoteToCashMissingAnchorsError extends QuoteToCashError {
  constructor(quotationId: string) {
    super(
      'QUOTE_TO_CASH_MISSING_ANCHORS',
      `Quotation ${quotationId} has no organization_id — cannot materialize party/client/contract.`,
      409,
      { quotationId }
    )
    this.name = 'QuoteToCashMissingAnchorsError'
  }
}
