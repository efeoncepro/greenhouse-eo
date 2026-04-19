import type { FinanceCurrency } from '@/lib/finance/contracts'

export const MARGIN_METRIC_KEYS = ['mrr', 'arr', 'tcv', 'acv'] as const
export type MarginMetricKey = (typeof MARGIN_METRIC_KEYS)[number]

export const ROLE_RATE_SENIORITY_LEVELS = ['junior', 'mid', 'senior', 'lead'] as const
export type RoleRateSeniorityLevel = (typeof ROLE_RATE_SENIORITY_LEVELS)[number]

export const QUOTATION_PRICING_CURRENCIES = ['CLP', 'USD', 'CLF'] as const
export type QuotationPricingCurrency = (typeof QUOTATION_PRICING_CURRENCIES)[number]

export const REVENUE_TYPES = ['recurring', 'one_time', 'hybrid'] as const
export type RevenueType = (typeof REVENUE_TYPES)[number]

export const LINE_RECURRENCE_TYPES = ['recurring', 'one_time', 'inherit'] as const
export type LineRecurrenceType = (typeof LINE_RECURRENCE_TYPES)[number]

export const RESOLVED_LINE_RECURRENCE_TYPES = ['recurring', 'one_time'] as const
export type ResolvedLineRecurrence = (typeof RESOLVED_LINE_RECURRENCE_TYPES)[number]

export const QUOTATION_BILLING_FREQUENCIES = ['monthly', 'milestone', 'one_time'] as const
export type QuotationBillingFrequency = (typeof QUOTATION_BILLING_FREQUENCIES)[number]

export const QUOTATION_LINE_TYPES = ['person', 'role', 'deliverable', 'direct_cost'] as const
export type QuotationLineType = (typeof QUOTATION_LINE_TYPES)[number]

export const QUOTATION_DISCOUNT_TYPES = ['percentage', 'fixed_amount'] as const
export type QuotationDiscountType = (typeof QUOTATION_DISCOUNT_TYPES)[number]

export interface MarginTarget {
  targetId: string
  businessLineCode: string | null
  targetMarginPct: number
  floorMarginPct: number
  effectiveFrom: string
  effectiveUntil: string | null
  notes: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface RoleRateCard {
  rateCardId: string
  businessLineCode: string | null
  roleCode: string
  seniorityLevel: RoleRateSeniorityLevel
  hourlyRateCost: number
  currency: QuotationPricingCurrency
  effectiveFrom: string
  effectiveUntil: string | null
  notes: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface RevenueMetricConfig {
  configId: string
  businessLineCode: string | null
  hubspotAmountMetric: MarginMetricKey
  pipelineDefaultMetric: MarginMetricKey
  active: boolean
  notes: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface MarginTargetResolution {
  targetMarginPct: number
  floorMarginPct: number
  source: 'quotation_override' | 'business_line' | 'global_default'
  businessLineCode: string | null
  targetId: string | null
}

export interface RoleRateCardResolution {
  rateCardId: string
  hourlyRateCost: number
  currency: QuotationPricingCurrency
  seniorityLevel: RoleRateSeniorityLevel
  effectiveFrom: string
  source: 'exact_match' | 'global_fallback'
}

export interface CostComponentBreakdown {
  salaryComponent: number | null
  employerCosts: number | null
  directOverhead: number | null
  structuralOverhead: number | null
  loadedTotal: number | null
  costPerHour: number | null
  sourcePeriod: string | null
  sourceCompensationVersionId: string | null
  sourcePayrollPeriodId: string | null
  fxRateApplied: number | null
  fxRateDate: string | null
  sourceCurrency: string | null
  targetCurrency: string | null
  snapshotSource: 'member_capacity_economics' | 'role_rate_card' | 'product_catalog' | 'manual' | 'pricing_engine_v2'
  roleCode?: string | null
  seniorityLevel?: RoleRateSeniorityLevel | null
  notes?: string | null
  pricingV2CostBasisKind?: 'member_actual' | 'role_blended' | 'role_modeled' | 'tool_snapshot' | 'manual' | null
  pricingV2CostBasisSourceRef?: string | null
  pricingV2CostBasisSnapshotDate?: string | null
  pricingV2CostBasisConfidenceScore?: number | null
  pricingV2CostBasisConfidenceLabel?: 'high' | 'medium' | 'low' | null
  pricingV2UnitCostUsd?: number | null
  pricingV2UnitCostOutputCurrency?: number | null
  pricingV2TotalCostUsd?: number | null
  pricingV2TotalCostOutputCurrency?: number | null
}

export interface LineCostResolutionInput {
  lineType: QuotationLineType
  quoteCurrency: QuotationPricingCurrency
  quoteDate: string
  businessLineCode: string | null
  memberId?: string | null
  periodYear?: number | null
  periodMonth?: number | null
  roleCode?: string | null
  seniorityLevel?: RoleRateSeniorityLevel | null
  productId?: string | null
  manualUnitCost?: number | null
  exchangeRates?: Record<string, number>
}

export interface LineCostResolutionResult {
  unitCost: number | null
  currency: QuotationPricingCurrency
  costBreakdown: CostComponentBreakdown
  resolutionNotes: string[]
}

export interface QuotationPricingTotals {
  totalCost: number
  totalPriceBeforeDiscount: number
  totalDiscount: number
  totalPrice: number
  effectiveMarginPct: number | null
}

export interface QuotationRevenueMetrics {
  mrr: number
  arr: number
  tcv: number | null
  acv: number | null
  revenueType: RevenueType
}

export interface LineItemForMetrics {
  subtotalAfterDiscount: number
  recurrenceType: LineRecurrenceType
}

export interface DiscountAlert {
  level: 'error' | 'warning' | 'info'
  code:
    | 'margin_below_zero'
    | 'margin_below_floor'
    | 'margin_below_target'
    | 'item_negative_margin'
    | 'discount_exceeds_threshold'
  message: string
  requiredApproval?: 'finance' | 'ops'
  deltaFromTarget?: number
  deltaFromFloor?: number
  discountPct?: number
  itemIds?: string[]
}

export interface DiscountHealthResult {
  healthy: boolean
  blocking: boolean
  requiresApproval: boolean
  quotationMarginPct: number | null
  marginTargetPct: number
  marginFloorPct: number
  deltaFromFloor: number | null
  deltaFromTarget: number | null
  discountPct: number | null
  alerts: DiscountAlert[]
}

export interface DiscountHealthInput {
  totals: QuotationPricingTotals
  marginTargetPct: number
  marginFloorPct: number
  lineItems?: Array<{
    lineItemId: string
    subtotalAfterDiscount: number
    subtotalCost: number | null
  }>
}

export type Currency = FinanceCurrency | 'CLF'

export const PRICING_OUTPUT_CURRENCIES = ['USD', 'CLP', 'CLF', 'COP', 'MXN', 'PEN'] as const
export type PricingOutputCurrency = (typeof PRICING_OUTPUT_CURRENCIES)[number]

export const PRICING_V2_LINE_TYPES = [
  'role',
  'person',
  'tool',
  'overhead_addon',
  'direct_cost'
] as const
export type PricingV2LineType = (typeof PRICING_V2_LINE_TYPES)[number]

export interface RolePricingLineInputV2 {
  lineType: 'role'
  roleSku: string
  employmentTypeCode?: string | null
  hours?: number | null
  fteFraction?: number | null
  periods?: number | null
  quantity?: number | null
  overrideMarginPct?: number | null
}

export interface PersonPricingLineInputV2 {
  lineType: 'person'
  memberId: string
  hours?: number | null
  fteFraction?: number | null
  periods?: number | null
  quantity?: number | null
  overrideMarginPct?: number | null
}

export interface ToolPricingLineInputV2 {
  lineType: 'tool'
  toolSku: string
  quantity: number
  periods?: number | null
}

export interface OverheadAddonPricingLineInputV2 {
  lineType: 'overhead_addon'
  addonSku: string
  basisSubtotal?: number | null
  quantity?: number | null
}

export interface DirectCostPricingLineInputV2 {
  lineType: 'direct_cost'
  label: string
  amount: number
  currency: string
  quantity?: number | null
}

export type PricingLineInputV2 =
  | RolePricingLineInputV2
  | PersonPricingLineInputV2
  | ToolPricingLineInputV2
  | OverheadAddonPricingLineInputV2
  | DirectCostPricingLineInputV2

export interface PricingEngineInputV2 {
  businessLineCode: string | null
  commercialModel: 'on_going' | 'on_demand' | 'hybrid' | 'license_consulting'
  countryFactorCode: string
  outputCurrency: PricingOutputCurrency
  quoteDate: string
  lines: PricingLineInputV2[]
  autoResolveAddons?: boolean
}

export interface PricingCostStackV2 {
  unitCostUsd: number
  unitCostOutputCurrency: number
  totalCostUsd: number
  totalCostOutputCurrency: number
  breakdown: Record<string, number>
  employmentTypeCode?: string | null
  employmentTypeSource?: 'explicit_input' | 'role_default' | 'payroll_compensation_version'
  costBasisKind?: 'member_actual' | 'role_blended' | 'role_modeled' | 'tool_snapshot' | 'manual'
  costBasisSourceRef?: string | null
  costBasisSnapshotDate?: string | null
  costBasisConfidenceScore?: number | null
  costBasisConfidenceLabel?: 'high' | 'medium' | 'low' | null
}

export interface TierComplianceV2 {
  tier?: string | null
  status: 'below_min' | 'in_range' | 'at_optimum' | 'above_max' | 'unknown'
  marginMin?: number | null
  marginOpt?: number | null
  marginMax?: number | null
}

export interface PricingSuggestedBillRateV2 {
  pricingBasis: 'hour' | 'month' | 'unit'
  unitPriceUsd: number
  unitPriceOutputCurrency: number
  totalBillUsd: number
  totalBillOutputCurrency: number
}

export interface PricingLineOutputV2 {
  lineInput: PricingLineInputV2
  costStack: PricingCostStackV2
  suggestedBillRate: PricingSuggestedBillRateV2
  effectiveMarginPct: number
  tierCompliance: TierComplianceV2
  resolutionNotes: string[]
}

export interface PricingAddonOutputV2 {
  sku: string
  addonName: string
  appliedReason: string
  amountUsd: number
  amountOutputCurrency: number
  visibleToClient: boolean
}

// Structured warnings for the pricing engine.
//
// The engine never hard-fails on unknown catalog inputs (unknown commercial
// model, unknown country factor, missing tier margins, etc.) because that would
// break quotes during legitimate catalog transitions (new BL onboarding,
// migrations, edge-case data). Instead, every silent fallback emits a warning
// so the UI can surface it and the user can decide whether to override.
//
// `code` is a stable machine-readable key for filtering / i18n / tests.
// `severity` drives the UI affordance (critical → red, warning → amber, info → neutral).
// `lineIndex` points at the offending line when the fallback is line-specific.
// `context` carries arbitrary debug payload (attempted input, fallback applied).
export const PRICING_WARNING_CODES = [
  'unknown_commercial_model',
  'unknown_country_factor',
  'missing_tier_margin',
  'tool_price_default_margin',
  'fx_fallback',
  'tier_below_min',
  'legacy_rate_card_used',

  // Synthetic UI-only code (TASK-487): emitted by the frontend when the engine
  // returns an HTTP 422 with a message that mentions an SKU, so the warning can
  // anchor to the originating row instead of floating in the dock.
  'engine_error'
] as const

export type PricingWarningCode = (typeof PRICING_WARNING_CODES)[number]
export type PricingWarningSeverity = 'critical' | 'warning' | 'info'

export interface PricingWarning {
  code: PricingWarningCode
  severity: PricingWarningSeverity
  message: string
  lineIndex?: number | null
  context?: Record<string, unknown>
}

export interface PricingEngineOutputV2 {
  lines: PricingLineOutputV2[]
  addons: PricingAddonOutputV2[]
  totals: {
    subtotalUsd: number
    overheadUsd: number
    totalUsd: number
    totalOutputCurrency: number
    commercialMultiplierApplied: number
    countryFactorApplied: number
    exchangeRateUsed: number
  }
  aggregateMargin: {
    marginPct: number
    classification: 'healthy' | 'warning' | 'critical'
  }

  /** Legacy plain-string warnings, derived from `structuredWarnings` for
   *  backwards compatibility with older UI consumers. Prefer reading
   *  `structuredWarnings` in new code. */
  warnings: string[]

  /** Canonical structured warnings emitted by every silent fallback in the
   *  engine. UI consumers should render these grouped by severity with a
   *  "Volver al valor sugerido" affordance when applicable. */
  structuredWarnings: PricingWarning[]
}
