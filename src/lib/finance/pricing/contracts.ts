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
  snapshotSource: 'member_capacity_economics' | 'role_rate_card' | 'product_catalog' | 'manual'
  roleCode?: string | null
  seniorityLevel?: RoleRateSeniorityLevel | null
  notes?: string | null
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
