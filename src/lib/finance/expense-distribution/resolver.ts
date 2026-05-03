import type { ExpenseEconomicCategory, ResolverConfidence } from '@/lib/finance/economic-category/types'
import { isExpenseEconomicCategory } from '@/lib/finance/economic-category/types'

import type {
  ExpenseDistributionExpenseInput,
  ExpenseDistributionLane,
  ExpenseDistributionResolutionDraft,
  ExpenseDistributionStatus
} from './types'

const FINANCIAL_PROVIDER_PATTERN = /\b(banco|santander|bci|itau|scotiabank|global66|wise|paypal|stripe|mercadopago|deuda|credito|cr[eé]dito|factoring|inter[eé]s|comisi[oó]n)\b/i
const PAYROLL_PROVIDER_PATTERN = /\b(deel|remote|payroll|n[oó]mina|honorarios|contractor|colaborador|salary|sueldo)\b/i
const REGULATOR_PATTERN = /\b(previred|afp|isapre|fonasa|mutual|sii|tgr|tesorer[ií]a|direcci[oó]n del trabajo)\b/i

const asNumber = (value: number | string | null | undefined): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'string') {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

const parseDate = (value: string | Date | null | undefined): Date | null => {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value

  const parsed = new Date(value)

  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const inferPeriod = (expense: ExpenseDistributionExpenseInput): { year: number; month: number; source: string } | null => {
  if (expense.periodYear && expense.periodMonth) {
    return { year: expense.periodYear, month: expense.periodMonth, source: 'expense_period_columns' }
  }

  const date =
    parseDate(expense.paymentDate) ??
    parseDate(expense.documentDate) ??
    parseDate(expense.receiptDate)

  if (!date) return null

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    source: 'expense_dates'
  }
}

const textEvidence = (expense: ExpenseDistributionExpenseInput) =>
  [
    expense.supplierName,
    expense.description,
    expense.paymentProvider,
    expense.paymentRail,
    expense.expenseType,
    expense.costCategory
  ]
    .filter(Boolean)
    .join(' ')

const hasMemberAnchor = (expense: ExpenseDistributionExpenseInput) =>
  Boolean(expense.memberId || expense.directOverheadMemberId || expense.payrollEntryId)

const memberAnchor = (expense: ExpenseDistributionExpenseInput) =>
  expense.memberId ?? expense.directOverheadMemberId ?? null

const clientAnchor = (expense: ExpenseDistributionExpenseInput) =>
  expense.allocatedClientId ?? expense.clientId ?? null

const confidenceFor = (
  status: ExpenseDistributionStatus,
  lane: ExpenseDistributionLane,
  hasRequiredAnchor: boolean
): ResolverConfidence => {
  if (status !== 'resolved') return 'manual_required'
  if (lane === 'unallocated') return 'manual_required'

  return hasRequiredAnchor ? 'high' : 'medium'
}

const buildDraft = ({
  expense,
  lane,
  status = 'resolved',
  matchedRule,
  confidence,
  riskFlags = [],
  evidence = {}
}: {
  expense: ExpenseDistributionExpenseInput
  lane: ExpenseDistributionLane
  status?: ExpenseDistributionStatus
  matchedRule: string
  confidence?: ResolverConfidence
  riskFlags?: string[]
  evidence?: Record<string, unknown>
}): ExpenseDistributionResolutionDraft => {
  const period = inferPeriod(expense)
  const amountClp = asNumber(expense.effectiveCostAmountClp) || asNumber(expense.totalAmountClp)
  const requiredAnchor =
    lane === 'member_direct_labor' || lane === 'member_direct_tool'
      ? hasMemberAnchor(expense)
      : lane === 'client_direct_non_labor'
        ? Boolean(clientAnchor(expense))
        : true

  if (!period) {
    return {
      expenseId: expense.expenseId,
      periodYear: 0,
      periodMonth: 0,
      distributionLane: 'unallocated',
      resolutionStatus: 'blocked',
      confidence: 'manual_required',
      source: 'deterministic_resolver',
      amountClp,
      basisAmountClp: amountClp,
      economicCategory: expense.economicCategory,
      legacyCostCategory: expense.costCategory ?? null,
      memberId: memberAnchor(expense),
      clientId: clientAnchor(expense),
      supplierId: expense.supplierId ?? null,
      toolCatalogId: expense.toolCatalogId ?? null,
      payrollEntryId: expense.payrollEntryId ?? null,
      payrollPeriodId: expense.payrollPeriodId ?? null,
      paymentObligationId: expense.paymentObligationId ?? null,
      evidence: {
        ...evidence,
        matched_rule: 'MISSING_PERIOD',
        original_matched_rule: matchedRule
      },
      riskFlags: [...new Set([...riskFlags, 'missing_period'])]
    }
  }

  return {
    expenseId: expense.expenseId,
    periodYear: period.year,
    periodMonth: period.month,
    distributionLane: lane,
    resolutionStatus: status,
    confidence: confidence ?? confidenceFor(status, lane, requiredAnchor),
    source: 'deterministic_resolver',
    amountClp,
    basisAmountClp: amountClp,
    economicCategory: expense.economicCategory,
    legacyCostCategory: expense.costCategory ?? null,
    memberId: memberAnchor(expense),
    clientId: clientAnchor(expense),
    supplierId: expense.supplierId ?? null,
    toolCatalogId: expense.toolCatalogId ?? null,
    payrollEntryId: expense.payrollEntryId ?? null,
    payrollPeriodId: expense.payrollPeriodId ?? null,
    paymentObligationId: expense.paymentObligationId ?? null,
    evidence: {
      ...evidence,
      matched_rule: matchedRule,
      period_source: period.source
    },
    riskFlags: [...new Set(riskFlags)]
  }
}

const resolveKnownEconomicCategory = (
  expense: ExpenseDistributionExpenseInput,
  category: ExpenseEconomicCategory
): ExpenseDistributionResolutionDraft => {
  const searchableText = textEvidence(expense)
  const clientId = clientAnchor(expense)

  if (
    expense.directOverheadScope === 'member_direct' &&
    expense.directOverheadKind &&
    ['tool_license', 'tool_usage'].includes(expense.directOverheadKind) &&
    hasMemberAnchor(expense)
  ) {
    return buildDraft({
      expense,
      lane: 'member_direct_tool',
      matchedRule: 'LEGACY_MEMBER_TOOL_ANCHOR',
      evidence: { direct_overhead_kind: expense.directOverheadKind }
    })
  }

  if (category === 'labor_cost_internal') {
    if (hasMemberAnchor(expense)) {
      return buildDraft({
        expense,
        lane: 'member_direct_labor',
        matchedRule: 'LABOR_INTERNAL_MEMBER_ANCHOR'
      })
    }

    return buildDraft({
      expense,
      lane: 'unallocated',
      status: 'manual_required',
      matchedRule: 'LABOR_INTERNAL_MISSING_MEMBER',
      riskFlags: ['missing_member_anchor']
    })
  }

  if (category === 'labor_cost_external') {
    if (hasMemberAnchor(expense) && expense.payrollEntryId) {
      return buildDraft({
        expense,
        lane: 'member_direct_labor',
        matchedRule: 'LABOR_EXTERNAL_PAYROLL_ENTRY_MEMBER_ANCHOR'
      })
    }

    if (PAYROLL_PROVIDER_PATTERN.test(searchableText)) {
      return buildDraft({
        expense,
        lane: 'provider_payroll',
        matchedRule: 'LABOR_EXTERNAL_PROVIDER_PAYROLL',
        evidence: { provider_text_matched: true },
        riskFlags: hasMemberAnchor(expense) ? ['provider_payroll_has_member_hint'] : []
      })
    }

    return buildDraft({
      expense,
      lane: 'unallocated',
      status: 'manual_required',
      matchedRule: 'LABOR_EXTERNAL_AMBIGUOUS',
      riskFlags: ['labor_external_without_payroll_evidence']
    })
  }

  if (category === 'regulatory_payment') {
    return buildDraft({
      expense,
      lane: 'regulatory_payment',
      matchedRule: REGULATOR_PATTERN.test(searchableText)
        ? 'REGULATORY_PAYMENT_KNOWN_REGULATOR'
        : 'REGULATORY_PAYMENT_CATEGORY',
      evidence: { regulator_text_matched: REGULATOR_PATTERN.test(searchableText) }
    })
  }

  if (category === 'tax') {
    return buildDraft({
      expense,
      lane: 'regulatory_payment',
      matchedRule: 'TAX_OUTSIDE_OPERATIONAL_OVERHEAD',
      riskFlags: ['tax_excluded_from_operational_overhead']
    })
  }

  if (category === 'financial_cost' || category === 'bank_fee_real') {
    return buildDraft({
      expense,
      lane: 'shared_financial_cost',
      matchedRule: FINANCIAL_PROVIDER_PATTERN.test(searchableText)
        ? 'FINANCIAL_COST_PROVIDER_MATCH'
        : 'FINANCIAL_COST_CATEGORY',
      evidence: { financial_text_matched: FINANCIAL_PROVIDER_PATTERN.test(searchableText) }
    })
  }

  if (category === 'financial_settlement') {
    return buildDraft({
      expense,
      lane: 'treasury_transit',
      matchedRule: 'FINANCIAL_SETTLEMENT_TREASURY_TRANSIT'
    })
  }

  if (category === 'vendor_cost_saas') {
    if (expense.toolCatalogId && hasMemberAnchor(expense)) {
      return buildDraft({
        expense,
        lane: 'member_direct_tool',
        matchedRule: 'SAAS_TOOL_MEMBER_ANCHOR'
      })
    }

    if (clientId && expense.costIsDirect) {
      return buildDraft({
        expense,
        lane: 'client_direct_non_labor',
        matchedRule: 'SAAS_DIRECT_CLIENT_ANCHOR'
      })
    }

    return buildDraft({
      expense,
      lane: 'shared_operational_overhead',
      matchedRule: 'SAAS_SHARED_OPERATIONAL'
    })
  }

  if (category === 'vendor_cost_professional_services' || category === 'overhead') {
    if (clientId && expense.costIsDirect) {
      return buildDraft({
        expense,
        lane: 'client_direct_non_labor',
        matchedRule: 'NON_LABOR_DIRECT_CLIENT_ANCHOR'
      })
    }

    return buildDraft({
      expense,
      lane: 'shared_operational_overhead',
      matchedRule: 'NON_LABOR_SHARED_OPERATIONAL'
    })
  }

  if (category === 'other' && FINANCIAL_PROVIDER_PATTERN.test(searchableText)) {
    return buildDraft({
      expense,
      lane: 'shared_financial_cost',
      matchedRule: 'OTHER_FINANCIAL_TEXT_MATCH',
      evidence: { financial_text_matched: true },
      riskFlags: ['economic_category_other_financial_text']
    })
  }

  return buildDraft({
    expense,
    lane: 'unallocated',
    status: 'manual_required',
    matchedRule: 'OTHER_MANUAL_REQUIRED',
    riskFlags: ['economic_category_other']
  })
}

export const resolveExpenseDistribution = (
  expense: ExpenseDistributionExpenseInput
): ExpenseDistributionResolutionDraft => {
  if (!expense.expenseId) {
    throw new Error('expenseId is required to resolve expense distribution')
  }

  if (!expense.economicCategory || !isExpenseEconomicCategory(expense.economicCategory)) {
    return buildDraft({
      expense,
      lane: 'unallocated',
      status: 'manual_required',
      matchedRule: 'MISSING_OR_UNKNOWN_ECONOMIC_CATEGORY',
      riskFlags: ['missing_or_unknown_economic_category']
    })
  }

  return resolveKnownEconomicCategory(expense, expense.economicCategory)
}
