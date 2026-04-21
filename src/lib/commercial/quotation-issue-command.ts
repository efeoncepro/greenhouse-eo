import 'server-only'

import { query } from '@/lib/db'

import { recordAudit } from '@/lib/commercial/governance/audit-log'
import { requestApproval } from '@/lib/commercial/governance/approval-steps-store'
import type { ApprovalStep } from '@/lib/commercial/governance/contracts'
import { publishQuotationApprovalRequested } from '@/lib/commercial/quotation-events'
import { finalizeQuotationIssued, type QuotationIssuanceActor } from '@/lib/commercial/quotation-issuance'
import {
  checkDiscountHealth,
  resolveMarginTarget
} from '@/lib/finance/pricing'
import { assertSupportedCurrencyForDomain } from '@/lib/finance/currency-domain'
import { resolveFxReadiness } from '@/lib/finance/fx-readiness'
import {
  buildQuotationFxSnapshot,
  type QuotationFxSnapshot
} from '@/lib/finance/quotation-fx-snapshot'
import {
  evaluateQuotationFxReadinessGate,
  QuotationFxReadinessError
} from '@/lib/finance/quotation-fx-readiness-gate'

interface QuotationHeaderRow extends Record<string, unknown> {
  business_line_code: string | null
  pricing_model: string
  commercial_model: string | null
  staffing_model: string | null
  total_cost: string | number | null
  total_price_before_discount: string | number | null
  total_discount: string | number | null
  total_price: string | number | null
  effective_margin_pct: string | number | null
  target_margin_pct: string | number | null
  margin_floor_pct: string | number | null
  current_version: number
  quote_date: string | Date | null
  status: string
  currency: string | null
}

// Canonical internal anchor for quotation FX snapshots. The pricing engine
// surfaces quote totals in the output currency, but the readiness matrix
// for pricing_output is bound to USD as the base comparator (see
// GREENHOUSE_FX_CURRENCY_PLATFORM_V1). Resolving USD→outputCurrency keeps
// the snapshot payload aligned with the resolver contract.
const QUOTATION_FX_BASE_CURRENCY = 'USD' as const

interface QuotationLineRow extends Record<string, unknown> {
  line_item_id: string
  subtotal_after_discount: string | number | null
  subtotal_cost: string | number | null
}

const toIsoDate = (value: string | Date | null): string => {
  if (!value) return new Date().toISOString().slice(0, 10)
  if (value instanceof Date) return value.toISOString().slice(0, 10)

  return value.slice(0, 10)
}

const toNumberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined) return null

  const parsed = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

const ISSUE_ALLOWED_STATUSES = new Set(['draft', 'approval_rejected'])

export interface RequestQuotationIssueParams {
  quotationId: string
  organizationId?: string | null
  spaceId?: string | null
  actor: QuotationIssuanceActor
}

export interface RequestQuotationIssueResult {
  quotationId: string
  issued: boolean
  sent: boolean
  approvalRequired: boolean
  newStatus: 'issued' | 'pending_approval'
  steps?: ApprovalStep[]
  health: ReturnType<typeof checkDiscountHealth>
  fxSnapshot?: QuotationFxSnapshot | null
}

export const requestQuotationIssue = async (
  params: RequestQuotationIssueParams
): Promise<RequestQuotationIssueResult> => {
  const headerRows = await query<QuotationHeaderRow>(
    `SELECT business_line_code, pricing_model, commercial_model, staffing_model, total_cost, total_price_before_discount,
            total_discount, total_price, effective_margin_pct, target_margin_pct,
            margin_floor_pct, current_version, quote_date, status, currency
       FROM greenhouse_commercial.quotations
       WHERE quotation_id = $1
         AND (
           ($2::text IS NOT NULL AND organization_id = $2)
           OR ($3::text IS NOT NULL AND space_id = $3)
         )`,
    [params.quotationId, params.organizationId, params.spaceId]
  )

  const header = headerRows[0]

  if (!header) {
    throw new Error('Quotation not found')
  }

  if (header.status === 'pending_approval') {
    throw new Error('La cotización está en aprobación. Resuelve los pasos pendientes antes de emitirla.')
  }

  if (header.status === 'issued' || header.status === 'sent' || header.status === 'approved') {
    throw new Error('La cotización ya fue emitida y no puede emitirse nuevamente.')
  }

  if (header.status === 'converted') {
    throw new Error('La cotización ya fue convertida en una venta.')
  }

  if (header.status === 'expired') {
    throw new Error('La cotización está expirada. Genera una nueva versión antes de emitirla.')
  }

  if (!ISSUE_ALLOWED_STATUSES.has(header.status)) {
    throw new Error(`Estado inválido para emisión: ${header.status}.`)
  }

  // ── FX readiness gate (TASK-466) ──────────────────────────────────────
  // Resolve the output currency against the canonical resolver and enforce
  // the client-facing stricter policy BEFORE opening approval steps. This
  // prevents wasting a reviewer's time on a quote that couldn't be sent to
  // the client anyway because the pair is unsupported or the rate is stale.
  const outputCurrency = assertSupportedCurrencyForDomain(
    header.currency ?? 'CLP',
    'pricing_output'
  )

  const fxReadiness = await resolveFxReadiness({
    fromCurrency: QUOTATION_FX_BASE_CURRENCY,
    toCurrency: outputCurrency,
    rateDate: toIsoDate(header.quote_date),
    domain: 'pricing_output'
  })

  const gateDecision = evaluateQuotationFxReadinessGate({ readiness: fxReadiness })

  if (!gateDecision.allowed) {
    throw new QuotationFxReadinessError(fxReadiness, gateDecision)
  }

  const lineRows = await query<QuotationLineRow>(
    `SELECT line_item_id, subtotal_after_discount, subtotal_cost
       FROM greenhouse_commercial.quotation_line_items
       WHERE quotation_id = $1 AND version_number = $2`,
    [params.quotationId, header.current_version]
  )

  const marginResolution = await resolveMarginTarget({
    businessLineCode: header.business_line_code,
    quoteDate: toIsoDate(header.quote_date),
    quotationOverride:
      toNumberOrNull(header.target_margin_pct) !== null &&
      toNumberOrNull(header.margin_floor_pct) !== null
        ? {
            targetMarginPct: Number(header.target_margin_pct),
            floorMarginPct: Number(header.margin_floor_pct)
          }
        : null
  })

  const health = checkDiscountHealth({
    totals: {
      totalCost: Number(header.total_cost ?? 0),
      totalPriceBeforeDiscount: Number(header.total_price_before_discount ?? 0),
      totalDiscount: Number(header.total_discount ?? 0),
      totalPrice: Number(header.total_price ?? 0),
      effectiveMarginPct: toNumberOrNull(header.effective_margin_pct)
    },
    marginTargetPct: marginResolution.targetMarginPct,
    marginFloorPct: marginResolution.floorMarginPct,
    lineItems: lineRows.map(line => ({
      lineItemId: line.line_item_id,
      subtotalAfterDiscount: Number(line.subtotal_after_discount ?? 0),
      subtotalCost: toNumberOrNull(line.subtotal_cost)
    }))
  })

  if (health.requiresApproval) {
    const result = await requestApproval({
      quotationId: params.quotationId,
      versionNumber: header.current_version,
      spaceId: params.spaceId,
      actor: params.actor,
      evaluationInput: {
        businessLineCode: header.business_line_code,
        pricingModel: header.pricing_model as 'staff_aug' | 'retainer' | 'project',
        quotationMarginPct: health.quotationMarginPct,
        marginTargetPct: health.marginTargetPct,
        marginFloorPct: health.marginFloorPct,
        totalPrice: Number(header.total_price ?? 0),
        discountPct: health.discountPct
      },
      requestOrigin: 'issue',
      issueContext: {
        marginPct: health.quotationMarginPct,
        marginFloorPct: health.marginFloorPct,
        marginTargetPct: health.marginTargetPct,
        currentStatus: header.status
      }
    })

    if (result.quotationStatusChanged) {
      await publishQuotationApprovalRequested({
        quotationId: params.quotationId,
        versionNumber: header.current_version,
        steps: result.steps.map(step => ({
          stepId: step.stepId,
          requiredRole: step.requiredRole,
          conditionLabel: step.conditionLabel
        })),
        requestedBy: params.actor.userId
      })
    }

    return {
      quotationId: params.quotationId,
      issued: false,
      sent: false,
      approvalRequired: true,
      newStatus: 'pending_approval',
      steps: result.steps,
      health,

      // Snapshot is NOT frozen yet; it will be resolved again at approval
      // time so the rate stays faithful to the moment the quote actually
      // becomes `issued`. The readiness gate has already cleared.
      fxSnapshot: null
    }
  }

  const fxSnapshot = buildQuotationFxSnapshot({
    readiness: fxReadiness,
    outputCurrency,
    baseCurrency: QUOTATION_FX_BASE_CURRENCY
  })

  await recordAudit({
    quotationId: params.quotationId,
    versionNumber: header.current_version,
    action: 'issue_requested',
    actorUserId: params.actor.userId,
    actorName: params.actor.name,
    details: {
      approvalRequired: false,
      marginPct: health.quotationMarginPct,
      marginFloorPct: health.marginFloorPct,
      marginTargetPct: health.marginTargetPct,
      currentStatus: header.status,
      fxReadiness: {
        outputCurrency,
        state: fxReadiness.state,
        rate: fxReadiness.rate,
        rateDateResolved: fxReadiness.rateDateResolved,
        source: fxReadiness.source,
        composedViaUsd: fxReadiness.composedViaUsd,
        gateCode: gateDecision.code,
        gateSeverity: gateDecision.severity
      }
    }
  })

  await finalizeQuotationIssued({
    quotationId: params.quotationId,
    versionNumber: header.current_version,
    actor: params.actor,
    organizationId: params.organizationId,
    spaceId: params.spaceId,
    pricingModel: header.pricing_model,
    commercialModel: header.commercial_model,
    staffingModel: header.staffing_model,
    viaApproval: false,
    fxSnapshot
  })

  return {
    quotationId: params.quotationId,
    issued: true,
    sent: true,
    approvalRequired: false,
    newStatus: 'issued',
    health,
    fxSnapshot
  }
}
