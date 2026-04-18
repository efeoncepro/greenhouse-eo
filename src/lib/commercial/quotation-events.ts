import 'server-only'

import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

interface QueryableClient {
  query: (text: string, values?: unknown[]) => Promise<unknown>
}

type Direction = 'inbound' | 'outbound'

interface BaseQuoteContext {
  quoteId: string
  hubspotQuoteId?: string | null
  hubspotDealId?: string | null
  sourceSystem?: string | null
  organizationId?: string | null
  spaceId?: string | null
  quotationId?: string | null
}

interface QuoteCreatedParams extends BaseQuoteContext {
  direction: Direction
  amount?: number | null
  currency?: string | null
  lineItemCount?: number | null
}

interface QuoteSyncedParams extends BaseQuoteContext {
  action: 'created' | 'updated' | 'skipped'
}

interface QuoteLineItemsSyncedParams extends BaseQuoteContext {
  created: number
  updated: number
}

interface QuoteConvertedParams extends BaseQuoteContext {
  incomeId: string
}

interface ProductSyncContext {
  productId: string
  hubspotProductId?: string | null
  name?: string | null
  sku?: string | null
  commercialProductId?: string | null
}

interface ProductSyncedParams extends ProductSyncContext {
  action: 'created' | 'updated' | 'skipped'
}

interface ProductCreatedParams extends ProductSyncContext {
  direction: Direction
}

interface DiscountHealthAlertParams {
  quotationId: string
  versionNumber?: number | null
  marginPct: number | null
  floorPct: number
  targetPct: number
  alerts: Array<Record<string, unknown>>
  createdBy?: string | null
}

/**
 * Publish quote-level created event in both namespaces:
 *   - `finance.quote.created` (aggregate_type='quote') — legacy compatibility
 *   - `commercial.quotation.created` (aggregate_type='quotation') — canonical
 *
 * Canonical event is only emitted when `quotationId` is available.
 */
export const publishQuoteCreated = async (
  params: QuoteCreatedParams,
  client?: QueryableClient
) => {
  const legacyPayload = {
    quoteId: params.quoteId,
    hubspotQuoteId: params.hubspotQuoteId ?? null,
    hubspotDealId: params.hubspotDealId ?? null,
    sourceSystem: params.sourceSystem ?? null,
    direction: params.direction,
    organizationId: params.organizationId ?? null,
    spaceId: params.spaceId ?? null,
    amount: params.amount ?? null,
    currency: params.currency ?? null,
    lineItemCount: params.lineItemCount ?? null
  }

  await publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.quote,
      aggregateId: params.quoteId,
      eventType: EVENT_TYPES.quoteCreated,
      payload: legacyPayload
    },
    client
  )

  if (params.quotationId) {
    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.quotation,
        aggregateId: params.quotationId,
        eventType: EVENT_TYPES.quotationCreated,
        payload: {
          ...legacyPayload,
          quotationId: params.quotationId
        }
      },
      client
    )
  }
}

export const publishQuoteSynced = async (
  params: QuoteSyncedParams,
  client?: QueryableClient
) => {
  const payload = {
    quoteId: params.quoteId,
    hubspotQuoteId: params.hubspotQuoteId ?? null,
    hubspotDealId: params.hubspotDealId ?? null,
    sourceSystem: params.sourceSystem ?? null,
    action: params.action,
    organizationId: params.organizationId ?? null,
    spaceId: params.spaceId ?? null
  }

  await publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.quote,
      aggregateId: params.quoteId,
      eventType: EVENT_TYPES.quoteSynced,
      payload
    },
    client
  )

  if (params.quotationId) {
    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.quotation,
        aggregateId: params.quotationId,
        eventType: EVENT_TYPES.quotationSynced,
        payload: {
          ...payload,
          quotationId: params.quotationId
        }
      },
      client
    )
  }
}

export const publishQuoteLineItemsSynced = async (
  params: QuoteLineItemsSyncedParams,
  client?: QueryableClient
) => {
  const payload = {
    quoteId: params.quoteId,
    hubspotQuoteId: params.hubspotQuoteId ?? null,
    created: params.created,
    updated: params.updated
  }

  await publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.quoteLineItem,
      aggregateId: params.quoteId,
      eventType: EVENT_TYPES.quoteLineItemSynced,
      payload
    },
    client
  )

  if (params.quotationId) {
    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.quotationLineItem,
        aggregateId: params.quotationId,
        eventType: EVENT_TYPES.quotationLineItemsSynced,
        payload: {
          ...payload,
          quotationId: params.quotationId
        }
      },
      client
    )
  }
}

export const publishQuoteConverted = async (
  params: QuoteConvertedParams,
  client?: QueryableClient
) => {
  const payload = {
    quoteId: params.quoteId,
    incomeId: params.incomeId,
    organizationId: params.organizationId ?? null,
    spaceId: params.spaceId ?? null
  }

  await publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.quote,
      aggregateId: params.quoteId,
      eventType: EVENT_TYPES.quoteConverted,
      payload
    },
    client
  )

  if (params.quotationId) {
    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.quotation,
        aggregateId: params.quotationId,
        eventType: EVENT_TYPES.quotationConverted,
        payload: {
          ...payload,
          quotationId: params.quotationId
        }
      },
      client
    )
  }
}

export const publishProductCreated = async (
  params: ProductCreatedParams,
  client?: QueryableClient
) => {
  const legacyPayload = {
    productId: params.productId,
    hubspotProductId: params.hubspotProductId ?? null,
    name: params.name ?? null,
    sku: params.sku ?? null,
    direction: params.direction
  }

  await publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.product,
      aggregateId: params.productId,
      eventType: EVENT_TYPES.productCreated,
      payload: legacyPayload
    },
    client
  )

  if (params.commercialProductId) {
    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.productCatalog,
        aggregateId: params.commercialProductId,
        eventType: EVENT_TYPES.productCatalogCreated,
        payload: {
          ...legacyPayload,
          commercialProductId: params.commercialProductId
        }
      },
      client
    )
  }
}

export const publishProductSynced = async (
  params: ProductSyncedParams,
  client?: QueryableClient
) => {
  const payload = {
    productId: params.productId,
    hubspotProductId: params.hubspotProductId ?? null,
    name: params.name ?? null,
    sku: params.sku ?? null,
    action: params.action
  }

  await publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.product,
      aggregateId: params.productId,
      eventType: EVENT_TYPES.productSynced,
      payload
    },
    client
  )

  if (params.commercialProductId) {
    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.productCatalog,
        aggregateId: params.commercialProductId,
        eventType: EVENT_TYPES.productCatalogSynced,
        payload: {
          ...payload,
          commercialProductId: params.commercialProductId
        }
      },
      client
    )
  }
}

/**
 * Emit a discount health alert. Called by the pricing orchestrator when an alert
 * with `level='error'` or `requiredApproval='finance'` is detected.
 *
 * Aggregate type is `quotation` (canonical) since the alert is scoped to the
 * canonical quotation identity; no legacy alias is emitted because this event
 * was born in the commercial namespace (TASK-346).
 */
export const publishDiscountHealthAlert = async (
  params: DiscountHealthAlertParams,
  client?: QueryableClient
) => {
  await publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.quotation,
      aggregateId: params.quotationId,
      eventType: EVENT_TYPES.quotationDiscountHealthAlert,
      payload: {
        quotationId: params.quotationId,
        versionNumber: params.versionNumber ?? null,
        marginPct: params.marginPct,
        floorPct: params.floorPct,
        targetPct: params.targetPct,
        alerts: params.alerts,
        createdBy: params.createdBy ?? null
      }
    },
    client
  )
}

// ═══════════════════════════════════════════════════════════════
// TASK-348 — Quotation Governance outbox publishers
// ═══════════════════════════════════════════════════════════════

interface VersionCreatedParams {
  quotationId: string
  fromVersion: number
  toVersion: number
  createdBy: string
  notes?: string | null
}

export const publishQuotationVersionCreated = async (
  params: VersionCreatedParams,
  client?: QueryableClient
) => {
  await publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.quotation,
      aggregateId: params.quotationId,
      eventType: EVENT_TYPES.quotationVersionCreated,
      payload: {
        quotationId: params.quotationId,
        fromVersion: params.fromVersion,
        toVersion: params.toVersion,
        createdBy: params.createdBy,
        notes: params.notes ?? null
      }
    },
    client
  )
}

interface ApprovalRequestedParams {
  quotationId: string
  versionNumber: number
  steps: Array<{
    stepId: string
    requiredRole: string
    conditionLabel: string
  }>
  requestedBy: string
}

export const publishQuotationApprovalRequested = async (
  params: ApprovalRequestedParams,
  client?: QueryableClient
) => {
  await publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.quotation,
      aggregateId: params.quotationId,
      eventType: EVENT_TYPES.quotationApprovalRequested,
      payload: {
        quotationId: params.quotationId,
        versionNumber: params.versionNumber,
        steps: params.steps,
        requestedBy: params.requestedBy
      }
    },
    client
  )
}

interface ApprovalDecidedParams {
  quotationId: string
  versionNumber: number
  stepId: string
  decision: 'approved' | 'rejected'
  decidedBy: string
  conditionLabel: string
  notes?: string | null
  resultingStatus: 'draft' | 'sent' | 'pending_approval' | null
}

export const publishQuotationApprovalDecided = async (
  params: ApprovalDecidedParams,
  client?: QueryableClient
) => {
  await publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.quotation,
      aggregateId: params.quotationId,
      eventType: EVENT_TYPES.quotationApprovalDecided,
      payload: {
        quotationId: params.quotationId,
        versionNumber: params.versionNumber,
        stepId: params.stepId,
        decision: params.decision,
        decidedBy: params.decidedBy,
        conditionLabel: params.conditionLabel,
        notes: params.notes ?? null,
        resultingStatus: params.resultingStatus
      }
    },
    client
  )

  if (params.resultingStatus === 'sent' && params.decision === 'approved') {
    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.quotation,
        aggregateId: params.quotationId,
        eventType: EVENT_TYPES.quotationSent,
        payload: {
          quotationId: params.quotationId,
          versionNumber: params.versionNumber,
          sentBy: params.decidedBy,
          postApproval: true
        }
      },
      client
    )
  }

  if (params.decision === 'rejected') {
    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.quotation,
        aggregateId: params.quotationId,
        eventType: EVENT_TYPES.quotationRejected,
        payload: {
          quotationId: params.quotationId,
          versionNumber: params.versionNumber,
          stepId: params.stepId,
          rejectedBy: params.decidedBy,
          notes: params.notes ?? null
        }
      },
      client
    )
  }
}

interface QuotationSentParams {
  quotationId: string
  versionNumber: number
  sentBy: string
}

export const publishQuotationSent = async (
  params: QuotationSentParams,
  client?: QueryableClient
) => {
  await publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.quotation,
      aggregateId: params.quotationId,
      eventType: EVENT_TYPES.quotationSent,
      payload: {
        quotationId: params.quotationId,
        versionNumber: params.versionNumber,
        sentBy: params.sentBy,
        postApproval: false
      }
    },
    client
  )
}

interface QuotationApprovedParams {
  quotationId: string
  approvedBy: string
}

export const publishQuotationApproved = async (
  params: QuotationApprovedParams,
  client?: QueryableClient
) => {
  await publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.quotation,
      aggregateId: params.quotationId,
      eventType: EVENT_TYPES.quotationApproved,
      payload: {
        quotationId: params.quotationId,
        approvedBy: params.approvedBy
      }
    },
    client
  )
}

interface TemplateUsedParams {
  templateId: string
  templateCode: string
  quotationId: string
  usedBy: string
}

export const publishTemplateUsed = async (
  params: TemplateUsedParams,
  client?: QueryableClient
) => {
  await publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.quotation,
      aggregateId: params.quotationId,
      eventType: EVENT_TYPES.quotationTemplateUsed,
      payload: {
        templateId: params.templateId,
        templateCode: params.templateCode,
        quotationId: params.quotationId,
        usedBy: params.usedBy
      }
    },
    client
  )
}

// ═══════════════════════════════════════════════════════════════
// TASK-350 — Quotation-to-Cash Document Chain Bridge publishers
// ═══════════════════════════════════════════════════════════════

interface QuotationPurchaseOrderLinkedParams {
  quotationId: string
  poId: string
  poNumber: string | null
  authorizedAmountClp: number | null
  linkedBy: string
}

export const publishQuotationPurchaseOrderLinked = async (
  params: QuotationPurchaseOrderLinkedParams,
  client?: QueryableClient
) => {
  await publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.quotation,
      aggregateId: params.quotationId,
      eventType: EVENT_TYPES.quotationPurchaseOrderLinked,
      payload: {
        quotationId: params.quotationId,
        poId: params.poId,
        poNumber: params.poNumber ?? null,
        authorizedAmountClp: params.authorizedAmountClp ?? null,
        linkedBy: params.linkedBy
      }
    },
    client
  )
}

interface QuotationServiceEntryLinkedParams {
  quotationId: string
  hesId: string
  hesNumber: string | null
  amountAuthorizedClp: number | null
  linkedBy: string
}

export const publishQuotationServiceEntryLinked = async (
  params: QuotationServiceEntryLinkedParams,
  client?: QueryableClient
) => {
  await publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.quotation,
      aggregateId: params.quotationId,
      eventType: EVENT_TYPES.quotationServiceEntryLinked,
      payload: {
        quotationId: params.quotationId,
        hesId: params.hesId,
        hesNumber: params.hesNumber ?? null,
        amountAuthorizedClp: params.amountAuthorizedClp ?? null,
        linkedBy: params.linkedBy
      }
    },
    client
  )
}

interface QuotationInvoiceEmittedParams {
  quotationId: string
  incomeId: string
  sourceHesId: string | null
  totalAmountClp: number | null
  emittedBy: string
}

export const publishQuotationInvoiceEmitted = async (
  params: QuotationInvoiceEmittedParams,
  client?: QueryableClient
) => {
  await publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.quotation,
      aggregateId: params.quotationId,
      eventType: EVENT_TYPES.quotationInvoiceEmitted,
      payload: {
        quotationId: params.quotationId,
        incomeId: params.incomeId,
        sourceHesId: params.sourceHesId ?? null,
        totalAmountClp: params.totalAmountClp ?? null,
        emittedBy: params.emittedBy
      }
    },
    client
  )
}

interface TemplateSavedParams {
  templateId: string
  templateCode: string
  sourceQuotationId: string | null
  createdBy: string
}

export const publishTemplateSaved = async (
  params: TemplateSavedParams,
  client?: QueryableClient
) => {
  await publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.quotation,
      aggregateId: params.sourceQuotationId ?? params.templateId,
      eventType: EVENT_TYPES.quotationTemplateSaved,
      payload: {
        templateId: params.templateId,
        templateCode: params.templateCode,
        sourceQuotationId: params.sourceQuotationId,
        createdBy: params.createdBy
      }
    },
    client
  )
}

// ═══════════════════════════════════════════════════════════════
// TASK-351 — Quotation Intelligence Automation publishers
// ═══════════════════════════════════════════════════════════════

interface QuotationExpiredParams {
  quotationId: string
  clientId: string | null
  organizationId: string | null
  totalAmountClp: number | null
  expiredAt: string
  daysSinceExpiry: number
}

export const publishQuotationExpired = async (
  params: QuotationExpiredParams,
  client?: QueryableClient
) => {
  await publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.quotation,
      aggregateId: params.quotationId,
      eventType: EVENT_TYPES.quotationExpired,
      payload: {
        quotationId: params.quotationId,
        clientId: params.clientId,
        organizationId: params.organizationId,
        totalAmountClp: params.totalAmountClp,
        expiredAt: params.expiredAt,
        daysSinceExpiry: params.daysSinceExpiry
      }
    },
    client
  )
}

interface QuotationRenewalDueParams {
  quotationId: string
  clientId: string | null
  organizationId: string | null
  totalAmountClp: number | null
  expiryDate: string | null
  daysUntilExpiry: number
}

export const publishQuotationRenewalDue = async (
  params: QuotationRenewalDueParams,
  client?: QueryableClient
) => {
  await publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.quotation,
      aggregateId: params.quotationId,
      eventType: EVENT_TYPES.quotationRenewalDue,
      payload: {
        quotationId: params.quotationId,
        clientId: params.clientId,
        organizationId: params.organizationId,
        totalAmountClp: params.totalAmountClp,
        expiryDate: params.expiryDate,
        daysUntilExpiry: params.daysUntilExpiry
      }
    },
    client
  )
}

interface QuotationPipelineMaterializedParams {
  quotationId: string
  pipelineStage: string
  status: string
  totalAmountClp: number | null
  probabilityPct: number
}

export const publishQuotationPipelineMaterialized = async (
  params: QuotationPipelineMaterializedParams,
  client?: QueryableClient
) => {
  await publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.quotation,
      aggregateId: params.quotationId,
      eventType: EVENT_TYPES.quotationPipelineMaterialized,
      payload: {
        quotationId: params.quotationId,
        pipelineStage: params.pipelineStage,
        status: params.status,
        totalAmountClp: params.totalAmountClp,
        probabilityPct: params.probabilityPct
      }
    },
    client
  )
}

interface QuotationProfitabilityMaterializedParams {
  quotationId: string
  periodYear: number
  periodMonth: number
  effectiveMarginPct: number | null
  quotedMarginPct: number | null
  marginDriftPct: number | null
  driftSeverity: 'aligned' | 'warning' | 'critical'
}

export const publishQuotationProfitabilityMaterialized = async (
  params: QuotationProfitabilityMaterializedParams,
  client?: QueryableClient
) => {
  await publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.quotation,
      aggregateId: params.quotationId,
      eventType: EVENT_TYPES.quotationProfitabilityMaterialized,
      payload: {
        quotationId: params.quotationId,
        periodYear: params.periodYear,
        periodMonth: params.periodMonth,
        effectiveMarginPct: params.effectiveMarginPct,
        quotedMarginPct: params.quotedMarginPct,
        marginDriftPct: params.marginDriftPct,
        driftSeverity: params.driftSeverity
      }
    },
    client
  )
}
