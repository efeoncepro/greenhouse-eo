import 'server-only'

// TASK-524: canonical types for the Income → HubSpot Invoice bridge.
//
// The bridge mirrors `greenhouse_finance.income` into HubSpot's native
// `invoice` object as a **non-billable mirror** (`hs_invoice_billable=false`).
// Nubox remains the emitter; HubSpot is a read-only reflection for CRM
// continuity, not a cobranza system. See GREENHOUSE_FINANCE_ARCHITECTURE_V1
// Delta 2026-04-21 (TASK-524).
//
// Drift between the TS unions below and the CHECK constraint installed by
// `20260421125353997_task-524-income-hubspot-invoice-trace.sql` will break
// the build on purpose — update both or neither.

export const INCOME_HUBSPOT_SYNC_STATUSES = [
  /** Reactive projection received the event; outbound is queued. */
  'pending',

  /** Cloud Run confirmed the invoice write. */
  'synced',

  /** Cloud Run returned an error; retry worker will pick this up. */
  'failed',

  /** The `/invoices` endpoint is not deployed yet — retries are safe no-ops. */
  'endpoint_not_deployed',

  /** The income has no `hubspot_company_id` nor `hubspot_deal_id` to anchor; degraded trace only. */
  'skipped_no_anchors'
] as const

export type IncomeHubSpotSyncStatus = (typeof INCOME_HUBSPOT_SYNC_STATUSES)[number]

/** Minimum CRM anchors the bridge needs to attempt a push. */
export interface IncomeHubSpotAnchors {
  hubspotCompanyId: string | null
  hubspotDealId: string | null

  /** Best-effort; if present, the bridge attempts `contact` association. */
  hubspotContactId?: string | null
}

/** Line item shape built from `greenhouse_finance.income_line_items` or synthesized from the income total. */
export interface IncomeHubSpotLineItem {
  description: string
  quantity: number
  unitPrice: number
  discountPercent?: number | null
  isExempt?: boolean | null
}

/** Full payload the Cloud Run `/invoices` endpoint receives. */
export interface IncomeHubSpotMirrorPayload {

  /** Greenhouse-side primary key — used as idempotency key. */
  incomeId: string

  /** Remote invoice id when we already have one (UPDATE path). */
  hubspotInvoiceId: string | null
  invoiceNumber: string | null
  invoiceDate: string
  dueDate: string | null
  currency: string
  subtotal: number
  taxAmount: number | null
  totalAmount: number
  totalAmountClp: number | null
  exchangeRateToClp: number | null
  description: string | null
  anchors: IncomeHubSpotAnchors
  lineItems: IncomeHubSpotLineItem[]

  /** Always false — Greenhouse/Nubox owns cobranza. */
  isBillable: false
}

/** Persisted trace after the bridge has been attempted. */
export interface IncomeHubSpotSyncTrace {
  incomeId: string
  hubspotInvoiceId: string | null
  hubspotSyncStatus: IncomeHubSpotSyncStatus
  hubspotSyncError: string | null
  hubspotLastSyncedAt: string
  hubspotSyncAttemptCount: number
}

// ── Error classes ─────────────────────────────────────────────────────────

export class IncomeHubSpotBridgeError extends Error {
  code: string
  statusCode: number
  details?: unknown

  constructor(code: string, message: string, statusCode = 500, details?: unknown) {
    super(message)
    this.name = 'IncomeHubSpotBridgeError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
  }
}

export class IncomeNotFoundError extends IncomeHubSpotBridgeError {
  constructor(incomeId: string) {
    super('INCOME_NOT_FOUND', `Income ${incomeId} does not exist.`, 404, { incomeId })
    this.name = 'IncomeNotFoundError'
  }
}
