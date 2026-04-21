import 'server-only'

import { query } from '@/lib/db'
import {
  upsertHubSpotGreenhouseInvoice,
  type HubSpotGreenhouseUpsertInvoiceRequest,
  type HubSpotGreenhouseUpsertInvoiceResponse
} from '@/lib/integrations/hubspot-greenhouse-service'

import {
  publishIncomeHubSpotSyncFailed,
  publishIncomeHubSpotSynced
} from './income-hubspot-events'
import {
  IncomeNotFoundError,
  type IncomeHubSpotLineItem,
  type IncomeHubSpotSyncStatus,
  type IncomeHubSpotSyncTrace
} from './types'

// TASK-524: canonical outbound bridge `greenhouse_finance.income` → HubSpot
// invoice object. Called by the reactive projection on `finance.income.*`
// events. Writes the trace + publishes synced/failed events atomically from
// the caller's perspective.
//
// Contract:
//  1. Idempotent by `income_id` — calling the bridge twice with the same
//     state is safe (UPDATE on Cloud Run side; trace updates are atomic
//     SQL UPDATEs keyed by income_id).
//  2. Never throws on missing anchors — writes `skipped_no_anchors` trace
//     and returns. The caller (projection) treats that as success.
//  3. Never throws on `endpoint_not_deployed` — writes the trace so the
//     retry worker can pick it up once the Cloud Run route ships.
//  4. Rethrows on network / 5xx so the reactive consumer retries with
//     backoff. The trace still records the last error.
//  5. Line items come from `greenhouse_finance.income_line_items` when
//     present; otherwise a synthetic single-line is built from the income
//     total.

interface IncomeSnapshot extends Record<string, unknown> {
  income_id: string
  hubspot_invoice_id: string | null
  hubspot_company_id: string | null
  hubspot_deal_id: string | null
  hubspot_sync_attempt_count: number
  invoice_number: string | null
  invoice_date: string
  due_date: string | null
  currency: string
  subtotal: string | number | null
  tax_amount: string | number | null
  total_amount: string | number
  total_amount_clp: string | number | null
  exchange_rate_to_clp: string | number | null
  description: string | null
}

interface LineItemRow extends Record<string, unknown> {
  description: string | null
  quantity: string | number | null
  unit_price: string | number | null
  discount_percent: string | number | null
  is_exempt: boolean | null
  total_amount: string | number | null
}

const toNum = (value: unknown): number => {
  if (value === null || value === undefined) return 0
  if (typeof value === 'number') return value
  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : 0
}

const toNullableNum = (value: unknown): number | null => {
  if (value === null || value === undefined) return null
  const parsed = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

const loadIncomeSnapshot = async (incomeId: string): Promise<IncomeSnapshot | null> => {
  const rows = await query<IncomeSnapshot>(
    `SELECT
       income_id,
       hubspot_invoice_id,
       hubspot_company_id,
       hubspot_deal_id,
       hubspot_sync_attempt_count,
       invoice_number,
       invoice_date::text AS invoice_date,
       due_date::text AS due_date,
       currency,
       subtotal,
       tax_amount,
       total_amount,
       total_amount_clp,
       exchange_rate_to_clp,
       description
     FROM greenhouse_finance.income
     WHERE income_id = $1
     LIMIT 1`,
    [incomeId]
  )

  return rows[0] ?? null
}

const loadIncomeLineItems = async (incomeId: string): Promise<IncomeHubSpotLineItem[]> => {
  const rows = await query<LineItemRow>(
    `SELECT description, quantity, unit_price, discount_percent, is_exempt, total_amount
     FROM greenhouse_finance.income_line_items
     WHERE income_id = $1
     ORDER BY line_number ASC`,
    [incomeId]
  )

  return rows.map(row => ({
    description: row.description?.trim() || 'Línea sin descripción',
    quantity: toNum(row.quantity) || 1,
    unitPrice: toNum(row.unit_price) || toNum(row.total_amount),
    discountPercent: toNullableNum(row.discount_percent),
    isExempt: row.is_exempt ?? false
  }))
}

const syntheticLineItem = (snapshot: IncomeSnapshot): IncomeHubSpotLineItem => ({
  description: snapshot.description?.trim() || snapshot.invoice_number || `Ingreso ${snapshot.income_id}`,
  quantity: 1,
  unitPrice: toNum(snapshot.total_amount),
  discountPercent: null,
  isExempt: false
})

const persistTrace = async (
  incomeId: string,
  update: {
    status: IncomeHubSpotSyncStatus
    hubspotInvoiceId: string | null
    errorMessage: string | null
    syncedAt: Date
    attemptCount: number
  }
): Promise<void> => {
  await query(
    `UPDATE greenhouse_finance.income
        SET hubspot_invoice_id = COALESCE($2, hubspot_invoice_id),
            hubspot_sync_status = $3,
            hubspot_sync_error = $4,
            hubspot_last_synced_at = $5,
            hubspot_sync_attempt_count = $6,
            updated_at = NOW()
      WHERE income_id = $1`,
    [
      incomeId,
      update.hubspotInvoiceId,
      update.status,
      update.errorMessage,
      update.syncedAt.toISOString(),
      update.attemptCount
    ]
  )
}

export interface PushIncomeToHubSpotResult {
  incomeId: string
  status: IncomeHubSpotSyncStatus
  hubspotInvoiceId: string | null
  message: string
}

/**
 * Attempt to mirror a Greenhouse income row into HubSpot as a non-billable
 * invoice. Writes a full trace regardless of outcome and emits
 * `finance.income.hubspot_synced` (success) or `.hubspot_sync_failed`
 * (any non-success path). Rethrows only on unexpected network / 5xx so the
 * reactive worker can schedule a retry.
 */
export const pushIncomeToHubSpot = async (
  incomeId: string
): Promise<PushIncomeToHubSpotResult> => {
  const snapshot = await loadIncomeSnapshot(incomeId)

  if (!snapshot) {
    throw new IncomeNotFoundError(incomeId)
  }

  const nextAttempt = (snapshot.hubspot_sync_attempt_count ?? 0) + 1
  const now = new Date()

  // Guard: no anchors → degraded trace, no outbound call, no retry.
  if (!snapshot.hubspot_company_id && !snapshot.hubspot_deal_id) {
    const message =
      'Income has no hubspot_company_id nor hubspot_deal_id; sync skipped until the upstream quote/contract carries an anchor.'

    await persistTrace(incomeId, {
      status: 'skipped_no_anchors',
      hubspotInvoiceId: snapshot.hubspot_invoice_id,
      errorMessage: message,
      syncedAt: now,
      attemptCount: nextAttempt
    })

    await publishIncomeHubSpotSyncFailed({
      incomeId,
      hubspotInvoiceId: snapshot.hubspot_invoice_id,
      status: 'skipped_no_anchors',
      errorMessage: message,
      failedAt: now.toISOString(),
      attemptCount: nextAttempt
    })

    return {
      incomeId,
      status: 'skipped_no_anchors',
      hubspotInvoiceId: snapshot.hubspot_invoice_id,
      message
    }
  }

  const lineItems = await loadIncomeLineItems(incomeId)
  const resolvedLineItems = lineItems.length > 0 ? lineItems : [syntheticLineItem(snapshot)]

  const request: HubSpotGreenhouseUpsertInvoiceRequest = {
    incomeId,
    hubspotInvoiceId: snapshot.hubspot_invoice_id,
    invoiceNumber: snapshot.invoice_number,
    invoiceDate: snapshot.invoice_date.slice(0, 10),
    dueDate: snapshot.due_date ? snapshot.due_date.slice(0, 10) : null,
    currency: snapshot.currency,
    subtotal: toNum(snapshot.subtotal),
    taxAmount: toNullableNum(snapshot.tax_amount),
    totalAmount: toNum(snapshot.total_amount),
    totalAmountClp: toNullableNum(snapshot.total_amount_clp),
    exchangeRateToClp: toNullableNum(snapshot.exchange_rate_to_clp),
    description: snapshot.description,
    isBillable: false,
    associations: {
      hubspotCompanyId: snapshot.hubspot_company_id,
      hubspotDealId: snapshot.hubspot_deal_id
    },
    lineItems: resolvedLineItems
  }

  let response: HubSpotGreenhouseUpsertInvoiceResponse

  try {
    response = await upsertHubSpotGreenhouseInvoice(request)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    await persistTrace(incomeId, {
      status: 'failed',
      hubspotInvoiceId: snapshot.hubspot_invoice_id,
      errorMessage,
      syncedAt: now,
      attemptCount: nextAttempt
    })

    await publishIncomeHubSpotSyncFailed({
      incomeId,
      hubspotInvoiceId: snapshot.hubspot_invoice_id,
      status: 'failed',
      errorMessage,
      failedAt: now.toISOString(),
      attemptCount: nextAttempt
    })

    // Rethrow so the reactive consumer retries with backoff.
    throw error
  }

  if (response.status === 'endpoint_not_deployed') {
    const message = response.message ?? 'Cloud Run /invoices endpoint not deployed yet.'

    await persistTrace(incomeId, {
      status: 'endpoint_not_deployed',
      hubspotInvoiceId: snapshot.hubspot_invoice_id,
      errorMessage: message,
      syncedAt: now,
      attemptCount: nextAttempt
    })

    await publishIncomeHubSpotSyncFailed({
      incomeId,
      hubspotInvoiceId: snapshot.hubspot_invoice_id,
      status: 'endpoint_not_deployed',
      errorMessage: message,
      failedAt: now.toISOString(),
      attemptCount: nextAttempt
    })

    return {
      incomeId,
      status: 'endpoint_not_deployed',
      hubspotInvoiceId: snapshot.hubspot_invoice_id,
      message
    }
  }

  const hubspotInvoiceId = response.hubspotInvoiceId ?? snapshot.hubspot_invoice_id

  await persistTrace(incomeId, {
    status: 'synced',
    hubspotInvoiceId,
    errorMessage: null,
    syncedAt: now,
    attemptCount: nextAttempt
  })

  await publishIncomeHubSpotSynced({
    incomeId,
    hubspotInvoiceId: hubspotInvoiceId ?? '',
    hubspotCompanyId: snapshot.hubspot_company_id,
    hubspotDealId: snapshot.hubspot_deal_id,
    syncedAt: now.toISOString(),
    attemptCount: nextAttempt
  })

  return {
    incomeId,
    status: 'synced',
    hubspotInvoiceId,
    message: response.status === 'created' ? 'Invoice created in HubSpot' : 'Invoice updated in HubSpot'
  }
}

/** Read helper — returns the persisted sync trace for diagnostics / ops. */
export const getIncomeHubSpotSyncTrace = async (
  incomeId: string
): Promise<IncomeHubSpotSyncTrace | null> => {
  const rows = await query<{
    income_id: string
    hubspot_invoice_id: string | null
    hubspot_sync_status: string | null
    hubspot_sync_error: string | null
    hubspot_last_synced_at: string | null
    hubspot_sync_attempt_count: number
  }>(
    `SELECT
       income_id,
       hubspot_invoice_id,
       hubspot_sync_status,
       hubspot_sync_error,
       hubspot_last_synced_at::text AS hubspot_last_synced_at,
       hubspot_sync_attempt_count
     FROM greenhouse_finance.income
     WHERE income_id = $1`,
    [incomeId]
  )

  const row = rows[0]

  if (!row) return null

  return {
    incomeId: row.income_id,
    hubspotInvoiceId: row.hubspot_invoice_id,
    hubspotSyncStatus: (row.hubspot_sync_status as IncomeHubSpotSyncStatus | null) ?? 'pending',
    hubspotSyncError: row.hubspot_sync_error,
    hubspotLastSyncedAt: row.hubspot_last_synced_at ?? '',
    hubspotSyncAttemptCount: Number(row.hubspot_sync_attempt_count ?? 0)
  }
}
