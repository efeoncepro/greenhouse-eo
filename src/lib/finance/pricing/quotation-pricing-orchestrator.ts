import 'server-only'

import { query, withTransaction } from '@/lib/db'
import { publishDiscountHealthAlert } from '@/lib/commercial/quotation-events'

import type {
  CostComponentBreakdown,
  DiscountHealthResult,
  LineCostResolutionResult,
  LineRecurrenceType,
  PricingLineInputV2,
  PricingLineOutputV2,
  PricingOutputCurrency,
  QuotationBillingFrequency,
  QuotationDiscountType,
  QuotationLineType,
  QuotationPricingCurrency,
  QuotationPricingReplayContext,
  QuotationPricingTotals,
  QuotationRevenueMetrics,
  RevenueMetricConfig,
  RoleRateSeniorityLevel
} from './contracts'
import { resolveLineItemCost } from './costing-engine'
import { convertCurrencyAmount, getExchangeRateOnOrBefore } from './currency-converter'
import { aggregateQuotationTotals, computeLineItemTotals } from './line-item-totals'
import { checkDiscountHealth } from './margin-health'
import { buildPricingEngineOutputV2 } from './pricing-engine-v2'
import { ensureQuotationLineInputsArePriced } from './quotation-line-input-validation'
import {
  resolveMarginTarget,
  resolveRevenueMetricConfig
} from './pricing-config-store'
import { computeRevenueMetrics } from './revenue-metrics'
import { buildQuotationTaxSnapshot } from './quotation-tax-snapshot'
import { computeChileTaxSnapshot } from '@/lib/tax/chile'

const round2 = (value: number): number => {
  if (!Number.isFinite(value)) return 0

  return Math.round(value * 100) / 100
}

const AUTO_REPRICE_LINE_TYPES = new Set<PricingLineInputV2['lineType']>([
  'role',
  'person',
  'tool',
  'overhead_addon'
])

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isPricingLineInputV2 = (value: unknown): value is PricingLineInputV2 => {
  if (!isRecord(value) || typeof value.lineType !== 'string') return false

  switch (value.lineType) {
    case 'role':
      return typeof value.roleSku === 'string'
    case 'person':
      return typeof value.memberId === 'string'
    case 'tool':
      return typeof value.toolSku === 'string'
    case 'overhead_addon':
      return typeof value.addonSku === 'string'
    case 'direct_cost':
      return typeof value.label === 'string' && Number.isFinite(Number(value.amount))
    default:
      return false
  }
}

const isReplayContext = (value: unknown): value is QuotationPricingReplayContext => {
  if (!isRecord(value)) return false

  const commercialModelCode = value.commercialModelCode
  const countryFactorCode = value.countryFactorCode
  const autoResolveAddons = value.autoResolveAddons

  return (
    (commercialModelCode == null || typeof commercialModelCode === 'string') &&
    (countryFactorCode == null || typeof countryFactorCode === 'string') &&
    (autoResolveAddons == null ||
      typeof autoResolveAddons === 'boolean' ||
      autoResolveAddons === 'internal_only')
  )
}

const buildResolvedCostBreakdownFromReplay = (
  simulationLine: PricingLineOutputV2,
  outputCurrency: PricingOutputCurrency
): CostComponentBreakdown => ({
  salaryComponent: null,
  employerCosts: null,
  directOverhead: null,
  structuralOverhead: null,
  loadedTotal: simulationLine.costStack.unitCostOutputCurrency,
  costPerHour:
    simulationLine.suggestedBillRate.pricingBasis === 'hour'
      ? simulationLine.costStack.unitCostOutputCurrency
      : null,
  sourcePeriod: null,
  sourceCompensationVersionId: null,
  sourcePayrollPeriodId: null,
  fxRateApplied: null,
  fxRateDate: null,
  sourceCurrency: outputCurrency,
  targetCurrency: outputCurrency,
  snapshotSource: 'pricing_engine_v2',
  notes: simulationLine.resolutionNotes.join(' | '),
  pricingV2CostBasisKind: simulationLine.costStack.costBasisKind ?? null,
  pricingV2CostBasisSourceRef: simulationLine.costStack.costBasisSourceRef ?? null,
  pricingV2CostBasisSnapshotDate: simulationLine.costStack.costBasisSnapshotDate ?? null,
  pricingV2CostBasisConfidenceScore: simulationLine.costStack.costBasisConfidenceScore ?? null,
  pricingV2CostBasisConfidenceLabel: simulationLine.costStack.costBasisConfidenceLabel ?? null,
  pricingV2UnitCostUsd: simulationLine.costStack.unitCostUsd,
  pricingV2UnitCostOutputCurrency: simulationLine.costStack.unitCostOutputCurrency,
  pricingV2TotalCostUsd: simulationLine.costStack.totalCostUsd,
  pricingV2TotalCostOutputCurrency: simulationLine.costStack.totalCostOutputCurrency
})

const buildMetadataFromPricingInput = (
  pricingInput: PricingLineInputV2 | null | undefined
): QuotationLineInput['metadata'] => {
  if (!pricingInput) return null

  switch (pricingInput.lineType) {
    case 'role':
      return {
        pricingV2LineType: 'role',
        sku: pricingInput.roleSku,
        fteFraction: pricingInput.fteFraction ?? null,
        periods: pricingInput.periods ?? null,
        employmentTypeCode: pricingInput.employmentTypeCode ?? null
      }
    case 'person':
      return {
        pricingV2LineType: 'person',
        sku: pricingInput.memberId,
        fteFraction: pricingInput.fteFraction ?? null,
        periods: pricingInput.periods ?? null
      }
    case 'tool':
      return {
        pricingV2LineType: 'tool',
        sku: pricingInput.toolSku,
        periods: pricingInput.periods ?? null
      }
    case 'overhead_addon':
      return {
        pricingV2LineType: 'overhead_addon',
        sku: pricingInput.addonSku
      }
    case 'direct_cost':
      return {
        pricingV2LineType: 'direct_cost',
        sku: null
      }
    default:
      return null
  }
}

export class UnsupportedQuotationReplayError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UnsupportedQuotationReplayError'
  }
}

export interface QuotationLineInput {
  lineItemId?: string | null
  financeLineItemId?: string | null
  financeProductId?: string | null
  productId?: string | null
  hubspotLineItemId?: string | null
  hubspotProductId?: string | null
  sourceSystem?: string | null
  lineType: QuotationLineType
  sortOrder?: number | null
  lineNumber?: number | null
  label: string
  description?: string | null
  memberId?: string | null
  roleCode?: string | null
  seniorityLevel?: RoleRateSeniorityLevel | null
  fteAllocation?: number | null
  hoursEstimated?: number | null
  unit?: 'hour' | 'month' | 'unit' | 'project'
  quantity: number
  unitPrice: number
  manualUnitCost?: number | null
  discountType?: QuotationDiscountType | null
  discountValue?: number | null
  recurrenceType?: LineRecurrenceType
  currency?: QuotationPricingCurrency | null
  notes?: string | null
  metadata?: {
    pricingV2LineType?: 'role' | 'person' | 'tool' | 'overhead_addon' | 'direct_cost'
    sku?: string | null
    fteFraction?: number | null
    periods?: number | null
    employmentTypeCode?: string | null
    moduleId?: string | null
    serviceSku?: string | null
    serviceLineOrder?: number | null
    templateItemId?: string | null
  } | null
  pricingInput?: PricingLineInputV2 | null
  resolvedCostBreakdown?: CostComponentBreakdown | null
  resolvedCostNotes?: string[] | null
}

export interface QuotationPricingInput {
  quotationId: string
  versionNumber: number
  businessLineCode: string | null
  quoteCurrency: QuotationPricingCurrency
  quoteDate: string
  billingFrequency: QuotationBillingFrequency
  contractDurationMonths: number | null
  exchangeRates?: Record<string, number>
  exchangeSnapshotDate?: string | null
  periodYear?: number | null
  periodMonth?: number | null
  globalDiscountType?: QuotationDiscountType | null
  globalDiscountValue?: number | null
  marginTargetPct?: number | null
  marginFloorPct?: number | null
  pricingContext?: QuotationPricingReplayContext | null
  lineItems: QuotationLineInput[]
  createdBy: string

  /**
   * TASK-530: canonical Chile tax code for the header (defaults to
   * `cl_vat_19`). Passed through to the tax snapshot builder.
   */
  taxCode?: string | null

  /** TASK-530: optional space override for tenant-scoped tax catalogue. */
  spaceId?: string | null
}

export interface PricedLineItem extends Omit<QuotationLineInput, 'recurrenceType'> {
  recurrenceType: LineRecurrenceType
  unitCost: number | null
  costBreakdown: CostComponentBreakdown
  subtotalCost: number | null
  subtotalPrice: number
  discountAmount: number
  subtotalAfterDiscount: number
  effectiveMarginPct: number | null
  resolutionNotes: string[]
  currencyResolved: QuotationPricingCurrency
}

export interface QuotationPricingSnapshot {
  quotationId: string
  versionNumber: number
  totals: QuotationPricingTotals
  marginResolution: {
    targetMarginPct: number
    floorMarginPct: number
    source: 'quotation_override' | 'business_line' | 'global_default'
  }
  revenue: QuotationRevenueMetrics
  revenueMetricConfig: RevenueMetricConfig | null
  health: DiscountHealthResult
  lineItems: PricedLineItem[]
  exchangeRates: Record<string, number>
  exchangeSnapshotDate: string | null
}

const resolveLineRecurrence = (value?: LineRecurrenceType): LineRecurrenceType =>
  value ?? 'inherit'

export const buildQuotationPricingSnapshot = async (
  input: QuotationPricingInput
): Promise<QuotationPricingSnapshot> => {
  const marginResolution = await resolveMarginTarget({
    businessLineCode: input.businessLineCode,
    quoteDate: input.quoteDate,
    quotationOverride:
      input.marginTargetPct != null && input.marginFloorPct != null
        ? { targetMarginPct: input.marginTargetPct, floorMarginPct: input.marginFloorPct }
        : null
  })

  const pricedLines: PricedLineItem[] = []

  for (const raw of input.lineItems) {
    const costResolution: LineCostResolutionResult =
      raw.manualUnitCost != null &&
      Number.isFinite(raw.manualUnitCost) &&
      raw.resolvedCostBreakdown
        ? {
            unitCost: round2(raw.manualUnitCost),
            currency: input.quoteCurrency,
            costBreakdown: raw.resolvedCostBreakdown,
            resolutionNotes: raw.resolvedCostNotes ?? []
          }
        : await resolveLineItemCost({
            lineType: raw.lineType,
            quoteCurrency: input.quoteCurrency,
            quoteDate: input.quoteDate,
            businessLineCode: input.businessLineCode,
            memberId: raw.memberId,
            roleCode: raw.roleCode,
            seniorityLevel: raw.seniorityLevel,
            productId: raw.productId,
            manualUnitCost: raw.manualUnitCost ?? null,
            periodYear: input.periodYear ?? null,
            periodMonth: input.periodMonth ?? null,
            exchangeRates: input.exchangeRates
          })

    const totals = computeLineItemTotals({
      lineItemId: raw.lineItemId,
      lineType: raw.lineType,
      quantity: raw.quantity,
      unitCost: costResolution.unitCost,
      unitPrice: raw.unitPrice,
      discountType: raw.discountType,
      discountValue: raw.discountValue,
      recurrenceType: resolveLineRecurrence(raw.recurrenceType),
      currency: raw.currency ?? null
    })

    pricedLines.push({
      ...raw,
      recurrenceType: resolveLineRecurrence(raw.recurrenceType),
      currencyResolved: costResolution.currency,
      unitCost: costResolution.unitCost,
      costBreakdown: costResolution.costBreakdown,
      subtotalCost: totals.subtotalCost,
      subtotalPrice: totals.subtotalPrice,
      discountAmount: totals.discountAmount,
      subtotalAfterDiscount: totals.subtotalAfterDiscount,
      effectiveMarginPct: totals.effectiveMarginPct,
      resolutionNotes: costResolution.resolutionNotes
    })
  }

  const quotationTotals = aggregateQuotationTotals({
    lineItems: pricedLines.map(line => ({
      subtotalPrice: line.subtotalPrice,
      subtotalCost: line.subtotalCost,
      discountAmount: line.discountAmount,
      subtotalAfterDiscount: line.subtotalAfterDiscount,
      effectiveMarginPct: line.effectiveMarginPct,
      marginAmount:
        line.subtotalCost != null ? round2(line.subtotalAfterDiscount - line.subtotalCost) : null
    })),
    globalDiscountType: input.globalDiscountType,
    globalDiscountValue: input.globalDiscountValue
  })

  const revenue = computeRevenueMetrics({
    lineItems: pricedLines.map(line => ({
      subtotalAfterDiscount: line.subtotalAfterDiscount,
      recurrenceType: line.recurrenceType
    })),
    billingFrequency: input.billingFrequency,
    contractDurationMonths: input.contractDurationMonths
  })

  const revenueMetricConfig = await resolveRevenueMetricConfig(input.businessLineCode)

  const health = checkDiscountHealth({
    totals: quotationTotals,
    marginTargetPct: marginResolution.targetMarginPct,
    marginFloorPct: marginResolution.floorMarginPct,
    lineItems: pricedLines
      .filter(line => line.lineItemId)
      .map(line => ({
        lineItemId: line.lineItemId!,
        subtotalAfterDiscount: line.subtotalAfterDiscount,
        subtotalCost: line.subtotalCost
      }))
  })

  return {
    quotationId: input.quotationId,
    versionNumber: input.versionNumber,
    totals: quotationTotals,
    marginResolution: {
      targetMarginPct: marginResolution.targetMarginPct,
      floorMarginPct: marginResolution.floorMarginPct,
      source: marginResolution.source
    },
    revenue,
    revenueMetricConfig,
    health,
    lineItems: pricedLines,
    exchangeRates: input.exchangeRates ?? {},
    exchangeSnapshotDate: input.exchangeSnapshotDate ?? null
  }
}

const buildLineSnapshotJson = (snapshot: QuotationPricingSnapshot) =>
  snapshot.lineItems.map(line => ({
    lineItemId: line.lineItemId ?? null,
    lineType: line.lineType,
    label: line.label,
    description: line.description ?? null,
    quantity: line.quantity,
    unit: line.unit ?? 'unit',
    unitCost: line.unitCost,
    unitPrice: line.unitPrice,
    subtotalCost: line.subtotalCost,
    subtotalPrice: line.subtotalPrice,
    discountType: line.discountType ?? null,
    discountValue: line.discountValue ?? null,
    discountAmount: line.discountAmount,
    subtotalAfterDiscount: line.subtotalAfterDiscount,
    effectiveMarginPct: line.effectiveMarginPct,
    recurrenceType: line.recurrenceType,
    currency: line.currencyResolved,
    memberId: line.memberId ?? null,
    roleCode: line.roleCode ?? null,
    productId: line.productId ?? null,
    pricingInput: line.pricingInput ?? null,
    costBreakdown: line.costBreakdown,
    resolutionNotes: line.resolutionNotes
  }))

export interface PersistQuotationPricingOptions {
  createVersion?: boolean
  versionNotes?: string | null
}

export const persistQuotationPricing = async (
  input: QuotationPricingInput,
  options: PersistQuotationPricingOptions = {}
): Promise<QuotationPricingSnapshot> => {
  ensureQuotationLineInputsArePriced(input.lineItems)

  const snapshot = await buildQuotationPricingSnapshot(input)
  const createVersion = options.createVersion ?? false

  const exchangeRateToClp =
    input.quoteCurrency === 'CLP'
      ? 1
      : await getExchangeRateOnOrBefore({
          fromCurrency: input.quoteCurrency,
          toCurrency: 'CLP',
          rateDate: input.quoteDate
        })

  const totalAmountClp =
    input.quoteCurrency === 'CLP'
      ? snapshot.totals.totalPrice
      : await convertCurrencyAmount({
          amount: snapshot.totals.totalPrice,
          fromCurrency: input.quoteCurrency,
          toCurrency: 'CLP',
          rateDate: input.quoteDate
        })

  // TASK-530: compute the Chile tax snapshot from the net subtotal so the
  // quote header persists `Neto / IVA / Total` explicitly and consistently
  // across builder / detail / PDF / email.
  const taxResolution = await buildQuotationTaxSnapshot({
    netAmount: snapshot.totals.totalPrice,
    taxCode: input.taxCode ?? null,
    spaceId: input.spaceId ?? null,
    issuedAt: input.quoteDate
  })

  await withTransaction(async client => {
    await client.query(
      `UPDATE greenhouse_commercial.quotations
         SET currency = $2,
             exchange_rates = $3::jsonb,
             exchange_snapshot_date = $4::date,
             business_line_code = $5,
             billing_frequency = $6,
             contract_duration_months = $7,
             global_discount_type = $8,
             global_discount_value = $9,
             target_margin_pct = $10,
             margin_floor_pct = $11,
             total_cost = $12,
             total_price_before_discount = $13,
             total_discount = $14,
             total_price = $15,
             effective_margin_pct = $16,
             revenue_type = $17,
             mrr = $18,
             arr = $19,
             tcv = $20,
             acv = $21,
             current_version = $22,
             subtotal = $23,
             total_amount = $24,
             total_amount_clp = $25,
             exchange_rate_to_clp = $26,
             pricing_context = $27::jsonb,
             tax_code = $28,
             tax_rate_snapshot = $29,
             tax_amount_snapshot = $30,
             tax_snapshot_json = $31::jsonb,
             is_tax_exempt = $32,
             tax_snapshot_frozen_at = NOW(),
             updated_at = CURRENT_TIMESTAMP
         WHERE quotation_id = $1`,
      [
        input.quotationId,
        input.quoteCurrency,
        JSON.stringify(input.exchangeRates ?? {}),
        input.exchangeSnapshotDate ?? null,
        input.businessLineCode,
        input.billingFrequency,
        input.contractDurationMonths,
        input.globalDiscountType ?? null,
        input.globalDiscountValue ?? null,
        snapshot.marginResolution.targetMarginPct,
        snapshot.marginResolution.floorMarginPct,
        snapshot.totals.totalCost,
        snapshot.totals.totalPriceBeforeDiscount,
        snapshot.totals.totalDiscount,
        snapshot.totals.totalPrice,
        snapshot.totals.effectiveMarginPct,
        snapshot.revenue.revenueType,
        snapshot.revenue.mrr,
        snapshot.revenue.arr,
        snapshot.revenue.tcv,
        snapshot.revenue.acv,
        input.versionNumber,
        snapshot.totals.totalPriceBeforeDiscount,
        snapshot.totals.totalPrice,
        totalAmountClp,
        exchangeRateToClp,
        JSON.stringify(input.pricingContext ?? {}),
        taxResolution.taxCode,
        taxResolution.rateSnapshot,
        taxResolution.taxAmountSnapshot,
        JSON.stringify(taxResolution.snapshot),
        taxResolution.isTaxExempt
      ]
    )

    await client.query(
      `DELETE FROM greenhouse_commercial.quotation_line_items
         WHERE quotation_id = $1
           AND version_number = $2`,
      [input.quotationId, input.versionNumber]
    )

    let sortCounter = 0

    for (const line of snapshot.lineItems) {
      sortCounter += 1

      // TASK-530: every line inherits the header tax code. Per-line override
      // is a follow-up; today the UI only edits the header. We still compute
      // a per-line snapshot so PDF/detail can render IVA line-by-line if
      // needed, and the header total remains the sum of the lines.
      const lineNetAmount = Math.max(0, round2(line.subtotalAfterDiscount ?? line.subtotalPrice ?? 0))

      const lineTaxSnapshot = computeChileTaxSnapshot({
        code: taxResolution.record,
        netAmount: lineNetAmount,
        issuedAt: input.quoteDate
      })

      await client.query(
        `INSERT INTO greenhouse_commercial.quotation_line_items (
           line_item_id,
           finance_line_item_id,
           finance_product_id,
           finance_quote_id,
           quotation_id,
           version_number,
           product_id,
           hubspot_line_item_id,
           hubspot_product_id,
           source_system,
           line_type,
           sort_order,
           line_number,
           label,
           description,
           member_id,
           role_code,
           fte_allocation,
           hours_estimated,
           unit,
           quantity,
           unit_cost,
           pricing_input,
           cost_breakdown,
           subtotal_cost,
           unit_price,
           subtotal_price,
           discount_type,
           discount_value,
           discount_amount,
           subtotal_after_discount,
           effective_margin_pct,
           recurrence_type,
           currency,
           notes,
           tax_code,
           tax_rate_snapshot,
           tax_amount_snapshot,
           tax_snapshot_json,
           is_tax_exempt
         ) VALUES (
           COALESCE($1, 'qli-' || gen_random_uuid()::text),
           $2, $3,
           (SELECT finance_quote_id FROM greenhouse_commercial.quotations WHERE quotation_id = $4),
           $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
           $15, $16, $17, $18, $19, $20, $21, $22::jsonb, $23::jsonb, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34,
           $35, $36, $37, $38::jsonb, $39
         )`,
        [
          line.lineItemId ?? null,
          line.financeLineItemId ?? null,
          line.financeProductId ?? null,
          input.quotationId,
          input.versionNumber,
          line.productId ?? null,
          line.hubspotLineItemId ?? null,
          line.hubspotProductId ?? null,
          line.sourceSystem ?? 'manual',
          line.lineType,
          line.sortOrder ?? sortCounter,
          line.lineNumber ?? sortCounter,
          line.label,
          line.description ?? null,
          line.memberId ?? null,
          line.roleCode ?? null,
          line.fteAllocation ?? null,
          line.hoursEstimated ?? null,
          line.unit ?? 'unit',
          line.quantity,
          line.unitCost,
          JSON.stringify(line.pricingInput ?? null),
          JSON.stringify(line.costBreakdown),
          line.subtotalCost,
          line.unitPrice,
          line.subtotalPrice,
          line.discountType ?? null,
          line.discountValue ?? null,
          line.discountAmount,
          line.subtotalAfterDiscount,
          line.effectiveMarginPct,
          line.recurrenceType,
          line.currencyResolved,
          line.notes ?? null,
          taxResolution.taxCode,
          taxResolution.rateSnapshot,
          lineTaxSnapshot.taxAmount,
          JSON.stringify(lineTaxSnapshot),
          taxResolution.isTaxExempt
        ]
      )
    }

    if (createVersion) {
      await client.query(
        `INSERT INTO greenhouse_commercial.quotation_versions (
           quotation_id,
           finance_quote_id,
           version_number,
           snapshot_json,
           total_cost,
           total_price,
           total_discount,
           effective_margin_pct,
           created_by,
           notes
         )
         SELECT
           $1,
           q.finance_quote_id,
           $2,
           $3::jsonb,
           $4, $5, $6, $7,
           $8, $9
         FROM greenhouse_commercial.quotations q
         WHERE q.quotation_id = $1
         ON CONFLICT (quotation_id, version_number) DO UPDATE SET
           snapshot_json = EXCLUDED.snapshot_json,
           total_cost = EXCLUDED.total_cost,
           total_price = EXCLUDED.total_price,
           total_discount = EXCLUDED.total_discount,
           effective_margin_pct = EXCLUDED.effective_margin_pct,
           created_by = EXCLUDED.created_by,
           notes = EXCLUDED.notes`,
        [
          input.quotationId,
          input.versionNumber,
          JSON.stringify(buildLineSnapshotJson(snapshot)),
          snapshot.totals.totalCost,
          snapshot.totals.totalPrice,
          snapshot.totals.totalDiscount,
          snapshot.totals.effectiveMarginPct,
          input.createdBy,
          options.versionNotes ?? null
        ]
      )
    }

    if (snapshot.health.alerts.some(alert => alert.level === 'error' || alert.requiredApproval === 'finance')) {
      try {
        await publishDiscountHealthAlert(
          {
            quotationId: input.quotationId,
            versionNumber: input.versionNumber,
            marginPct: snapshot.totals.effectiveMarginPct,
            floorPct: snapshot.marginResolution.floorMarginPct,
            targetPct: snapshot.marginResolution.targetMarginPct,
            alerts: snapshot.health.alerts as unknown as Array<Record<string, unknown>>,
            createdBy: input.createdBy
          },
          client
        )
      } catch (error) {
        // Outbox insertion is best-effort; alert publishing should not block save.
        // eslint-disable-next-line no-console
        console.warn('[quotation-pricing] outbox health alert emit failed', error)
      }
    }
  })

  return snapshot
}

export interface RecalculateQuotationInput {
  quotationId: string
  createdBy: string
  createVersion?: boolean
  strictReplay?: boolean
}

export const recalculateQuotationPricing = async (
  input: RecalculateQuotationInput
): Promise<QuotationPricingSnapshot> => {
  const quoteRows = await query<{
    quotation_id: string
    business_line_code: string | null
    currency: string
    quote_date: string | Date | null
    billing_frequency: string
    contract_duration_months: number | null
    exchange_rates: Record<string, unknown> | null
    exchange_snapshot_date: string | Date | null
    global_discount_type: string | null
    global_discount_value: string | number | null
    target_margin_pct: string | number | null
    margin_floor_pct: string | number | null
    pricing_context: unknown
    current_version: number
  }>(
    `SELECT quotation_id, business_line_code, currency, quote_date,
            billing_frequency, contract_duration_months,
            exchange_rates, exchange_snapshot_date,
            global_discount_type, global_discount_value,
            target_margin_pct, margin_floor_pct, pricing_context, current_version
     FROM greenhouse_commercial.quotations
     WHERE quotation_id = $1`,
    [input.quotationId]
  )

  const quote = quoteRows[0]

  if (!quote) {
    throw new Error(`Quotation ${input.quotationId} not found.`)
  }

  const quoteDate =
    quote.quote_date instanceof Date
      ? quote.quote_date.toISOString().slice(0, 10)
      : quote.quote_date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)

  const exchangeRates: Record<string, number> = {}

  if (quote.exchange_rates && typeof quote.exchange_rates === 'object') {
    for (const [key, val] of Object.entries(quote.exchange_rates)) {
      const num = Number(val)

      if (Number.isFinite(num) && num > 0) exchangeRates[key] = num
    }
  }

  const linesRows = await query<{
    line_item_id: string
    finance_line_item_id: string | null
    finance_product_id: string | null
    product_id: string | null
    hubspot_line_item_id: string | null
    hubspot_product_id: string | null
    source_system: string | null
    line_type: string
    sort_order: number | null
    line_number: number | null
    label: string
    description: string | null
    member_id: string | null
    role_code: string | null
    fte_allocation: string | number | null
    hours_estimated: string | number | null
    unit: string
    quantity: string | number
    unit_cost: string | number | null
    unit_price: string | number | null
    discount_type: string | null
    discount_value: string | number | null
    recurrence_type: string
    currency: string | null
    notes: string | null
    cost_breakdown: unknown
    pricing_input: unknown
  }>(
    `SELECT line_item_id, finance_line_item_id, finance_product_id, product_id,
            hubspot_line_item_id, hubspot_product_id, source_system, line_type,
            sort_order, line_number, label, description, member_id, role_code,
            fte_allocation, hours_estimated, unit, quantity, unit_cost, unit_price,
            discount_type, discount_value, recurrence_type, currency, notes,
            cost_breakdown, pricing_input
     FROM greenhouse_commercial.quotation_line_items
     WHERE quotation_id = $1 AND version_number = $2
     ORDER BY sort_order ASC, created_at ASC`,
    [input.quotationId, quote.current_version]
  )

  const pricingContext = isReplayContext(quote.pricing_context) ? quote.pricing_context : null

  const replayableRows = linesRows
    .map(row => ({
      row,
      pricingInput: isPricingLineInputV2(row.pricing_input) ? row.pricing_input : null
    }))
    .filter(
      (
        candidate
      ): candidate is {
        row: (typeof linesRows)[number]
        pricingInput: PricingLineInputV2
      } =>
        candidate.pricingInput != null &&
        AUTO_REPRICE_LINE_TYPES.has(candidate.pricingInput.lineType)
    )

  const hasReplayableLines = replayableRows.length > 0

  const canReplay =
    hasReplayableLines &&
    pricingContext?.commercialModelCode &&
    pricingContext.countryFactorCode &&
    ['CLP', 'USD', 'CLF'].includes(String(quote.currency || 'CLP'))

  if (input.strictReplay && hasReplayableLines && !canReplay) {
    throw new UnsupportedQuotationReplayError(
      `Quotation ${input.quotationId} is missing pricing replay context.`
    )
  }

  const replayOutputsByLineId = new Map<string, PricingLineOutputV2>()

  if (canReplay) {
    const replayResult = await buildPricingEngineOutputV2({
      businessLineCode: quote.business_line_code,
      commercialModel: pricingContext.commercialModelCode!,
      countryFactorCode: pricingContext.countryFactorCode!,
      outputCurrency: quote.currency as PricingOutputCurrency,
      quoteDate,
      lines: replayableRows.map(candidate => candidate.pricingInput),
      autoResolveAddons: pricingContext.autoResolveAddons ?? 'internal_only'
    })

    replayableRows.forEach((candidate, index) => {
      const replayLine = replayResult.lines[index]

      if (replayLine) {
        replayOutputsByLineId.set(candidate.row.line_item_id, replayLine)
      }
    })
  }

  if (input.strictReplay) {
    const missingReplayLine = replayableRows.find(
      candidate => !replayOutputsByLineId.has(candidate.row.line_item_id)
    )

    if (missingReplayLine) {
      throw new UnsupportedQuotationReplayError(
        `Quotation ${input.quotationId} has replayable lines without engine output.`
      )
    }
  }

  const lineItems: QuotationLineInput[] = linesRows.map(row => {
    const pricingInput = isPricingLineInputV2(row.pricing_input) ? row.pricing_input : null
    const replayOutput = replayOutputsByLineId.get(row.line_item_id)

    const isAutoReplayLine =
      pricingInput != null && AUTO_REPRICE_LINE_TYPES.has(pricingInput.lineType)

    const persistedBreakdown = isRecord(row.cost_breakdown)
      ? (row.cost_breakdown as unknown as CostComponentBreakdown)
      : null

    return {
      lineItemId: row.line_item_id,
      financeLineItemId: row.finance_line_item_id,
      financeProductId: row.finance_product_id,
      productId: row.product_id,
      hubspotLineItemId: row.hubspot_line_item_id,
      hubspotProductId: row.hubspot_product_id,
      sourceSystem: row.source_system,
      lineType: row.line_type as QuotationLineType,
      sortOrder: row.sort_order,
      lineNumber: row.line_number,
      label: row.label,
      description: row.description,
      memberId: row.member_id,
      roleCode: row.role_code,
      seniorityLevel: null,
      fteAllocation: row.fte_allocation != null ? Number(row.fte_allocation) : null,
      hoursEstimated: row.hours_estimated != null ? Number(row.hours_estimated) : null,
      unit: (row.unit as 'hour' | 'month' | 'unit' | 'project') || 'unit',
      quantity: Number(row.quantity) || 0,
      unitPrice: replayOutput
        ? replayOutput.suggestedBillRate.unitPriceOutputCurrency
        : Number(row.unit_price) || 0,
      manualUnitCost: replayOutput
        ? replayOutput.costStack.unitCostOutputCurrency
        : !isAutoReplayLine && row.unit_cost != null
          ? Number(row.unit_cost)
          : null,
      discountType: (row.discount_type as QuotationDiscountType | null) ?? null,
      discountValue: row.discount_value != null ? Number(row.discount_value) : null,
      recurrenceType: (row.recurrence_type as LineRecurrenceType) ?? 'inherit',
      currency: (row.currency as QuotationPricingCurrency | null) ?? null,
      notes: row.notes,
      metadata: buildMetadataFromPricingInput(pricingInput),
      pricingInput,
      resolvedCostBreakdown: replayOutput
        ? buildResolvedCostBreakdownFromReplay(
            replayOutput,
            quote.currency as PricingOutputCurrency
          )
        : !isAutoReplayLine
          ? persistedBreakdown
          : null,
      resolvedCostNotes: replayOutput
        ? replayOutput.resolutionNotes
        : persistedBreakdown?.notes
          ? [persistedBreakdown.notes]
          : []
    }
  })

  return persistQuotationPricing(
    {
      quotationId: input.quotationId,
      versionNumber: quote.current_version,
      businessLineCode: quote.business_line_code,
      quoteCurrency: (quote.currency as QuotationPricingCurrency) || 'CLP',
      quoteDate,
      billingFrequency: (quote.billing_frequency as QuotationBillingFrequency) || 'one_time',
      contractDurationMonths: quote.contract_duration_months,
      exchangeRates,
      exchangeSnapshotDate:
        quote.exchange_snapshot_date instanceof Date
          ? quote.exchange_snapshot_date.toISOString().slice(0, 10)
          : quote.exchange_snapshot_date?.slice(0, 10) ?? null,
      globalDiscountType: quote.global_discount_type as QuotationDiscountType | null,
      globalDiscountValue:
        quote.global_discount_value != null ? Number(quote.global_discount_value) : null,
      marginTargetPct: quote.target_margin_pct != null ? Number(quote.target_margin_pct) : null,
      marginFloorPct: quote.margin_floor_pct != null ? Number(quote.margin_floor_pct) : null,
      pricingContext,
      lineItems,
      createdBy: input.createdBy
    },
    { createVersion: input.createVersion ?? false, versionNotes: 'Pricing recalculation' }
  )
}
