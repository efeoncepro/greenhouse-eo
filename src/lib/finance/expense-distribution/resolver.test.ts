import { describe, expect, it } from 'vitest'

import { resolveExpenseDistribution } from './resolver'
import type { ExpenseDistributionExpenseInput } from './types'

const baseExpense = (
  overrides: Partial<ExpenseDistributionExpenseInput>
): ExpenseDistributionExpenseInput => ({
  expenseId: 'EXP-1',
  periodYear: 2026,
  periodMonth: 4,
  totalAmountClp: 100_000,
  effectiveCostAmountClp: 90_000,
  economicCategory: 'vendor_cost_saas',
  costCategory: 'operational',
  costIsDirect: false,
  ...overrides
})

describe('resolveExpenseDistribution', () => {
  it('keeps Deel/provider payroll out of operational overhead', () => {
    const result = resolveExpenseDistribution(
      baseExpense({
        economicCategory: 'labor_cost_external',
        supplierName: 'Deel Inc.',
        description: 'Pago Deel Melkin abril 2026',
        paymentProvider: 'deel'
      })
    )

    expect(result.distributionLane).toBe('provider_payroll')
    expect(result.resolutionStatus).toBe('resolved')
    expect(result.riskFlags).toEqual([])
    expect(result.evidence.matched_rule).toBe('LABOR_EXTERNAL_PROVIDER_PAYROLL')
  })

  it('keeps Previred and regulator payments in regulatory lane', () => {
    const result = resolveExpenseDistribution(
      baseExpense({
        economicCategory: 'regulatory_payment',
        supplierName: 'Previred',
        description: 'Pago cotizaciones Valentina abril'
      })
    )

    expect(result.distributionLane).toBe('regulatory_payment')
    expect(result.evidence.matched_rule).toBe('REGULATORY_PAYMENT_KNOWN_REGULATOR')
  })

  it('keeps bank fees and financial costs out of shared operational overhead', () => {
    const result = resolveExpenseDistribution(
      baseExpense({
        economicCategory: 'bank_fee_real',
        supplierName: 'Banco Santander',
        description: 'Comision mantencion cuenta corriente'
      })
    )

    expect(result.distributionLane).toBe('shared_financial_cost')
    expect(result.evidence.matched_rule).toBe('FINANCIAL_COST_PROVIDER_MATCH')
  })

  it('uses member direct tool lane only when tool and member anchors exist', () => {
    const result = resolveExpenseDistribution(
      baseExpense({
        economicCategory: 'vendor_cost_saas',
        toolCatalogId: 'figma',
        directOverheadScope: 'member_direct',
        directOverheadKind: 'tool_license',
        directOverheadMemberId: 'mem-1'
      })
    )

    expect(result.distributionLane).toBe('member_direct_tool')
    expect(result.memberId).toBe('mem-1')
    expect(result.confidence).toBe('high')
  })

  it('uses client direct non-labor only with direct client evidence', () => {
    const result = resolveExpenseDistribution(
      baseExpense({
        economicCategory: 'vendor_cost_professional_services',
        costIsDirect: true,
        allocatedClientId: 'client-sky'
      })
    )

    expect(result.distributionLane).toBe('client_direct_non_labor')
    expect(result.clientId).toBe('client-sky')
    expect(result.confidence).toBe('high')
  })

  it('places generic SaaS in shared operational overhead', () => {
    const result = resolveExpenseDistribution(
      baseExpense({
        economicCategory: 'vendor_cost_saas',
        supplierName: 'Notion'
      })
    )

    expect(result.distributionLane).toBe('shared_operational_overhead')
  })

  it('blocks rows without a resolvable period instead of silently distributing them', () => {
    const result = resolveExpenseDistribution(
      baseExpense({
        periodYear: null,
        periodMonth: null,
        paymentDate: null,
        documentDate: null,
        receiptDate: null
      })
    )

    expect(result.distributionLane).toBe('unallocated')
    expect(result.resolutionStatus).toBe('blocked')
    expect(result.riskFlags).toContain('missing_period')
  })

  it('requires manual review for unknown economic categories', () => {
    const result = resolveExpenseDistribution(
      baseExpense({
        economicCategory: 'legacy-weird-category'
      })
    )

    expect(result.distributionLane).toBe('unallocated')
    expect(result.resolutionStatus).toBe('manual_required')
    expect(result.riskFlags).toContain('missing_or_unknown_economic_category')
  })
})
