import type { ExpenseEconomicCategory, ResolverConfidence } from '@/lib/finance/economic-category/types'

export const EXPENSE_DISTRIBUTION_LANES = [
  'member_direct_labor',
  'member_direct_tool',
  'client_direct_non_labor',
  'shared_operational_overhead',
  'shared_financial_cost',
  'regulatory_payment',
  'provider_payroll',
  'treasury_transit',
  'unallocated'
] as const

export type ExpenseDistributionLane = (typeof EXPENSE_DISTRIBUTION_LANES)[number]

export const EXPENSE_DISTRIBUTION_STATUSES = [
  'resolved',
  'manual_required',
  'blocked',
  'superseded'
] as const

export type ExpenseDistributionStatus = (typeof EXPENSE_DISTRIBUTION_STATUSES)[number]

export const EXPENSE_DISTRIBUTION_SOURCES = [
  'deterministic_resolver',
  'manual_override',
  'legacy_override',
  'ai_approved',
  'migration_backfill'
] as const

export type ExpenseDistributionSource = (typeof EXPENSE_DISTRIBUTION_SOURCES)[number]

export interface ExpenseDistributionExpenseInput {
  expenseId: string
  periodYear: number | null
  periodMonth: number | null
  paymentDate?: string | Date | null
  documentDate?: string | Date | null
  receiptDate?: string | Date | null
  totalAmountClp: number | string | null
  effectiveCostAmountClp?: number | string | null
  economicCategory: ExpenseEconomicCategory | string | null
  costCategory?: string | null
  costIsDirect?: boolean | null
  expenseType?: string | null
  supplierId?: string | null
  supplierName?: string | null
  description?: string | null
  paymentProvider?: string | null
  paymentRail?: string | null
  memberId?: string | null
  payrollEntryId?: string | null
  payrollPeriodId?: string | null
  clientId?: string | null
  allocatedClientId?: string | null
  toolCatalogId?: string | null
  directOverheadScope?: string | null
  directOverheadKind?: string | null
  directOverheadMemberId?: string | null
  paymentObligationId?: string | null
}

export interface ExpenseDistributionResolutionDraft {
  expenseId: string
  periodYear: number
  periodMonth: number
  distributionLane: ExpenseDistributionLane
  resolutionStatus: ExpenseDistributionStatus
  confidence: ResolverConfidence
  source: ExpenseDistributionSource
  amountClp: number
  basisAmountClp: number | null
  economicCategory: string | null
  legacyCostCategory: string | null
  memberId: string | null
  clientId: string | null
  supplierId: string | null
  toolCatalogId: string | null
  payrollEntryId: string | null
  payrollPeriodId: string | null
  paymentObligationId: string | null
  evidence: Record<string, unknown>
  riskFlags: string[]
}

export const isExpenseDistributionLane = (value: unknown): value is ExpenseDistributionLane =>
  typeof value === 'string' && (EXPENSE_DISTRIBUTION_LANES as readonly string[]).includes(value)
