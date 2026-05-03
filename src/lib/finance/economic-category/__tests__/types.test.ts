import { describe, expect, it } from 'vitest'

import {
  EXPENSE_ECONOMIC_CATEGORIES,
  INCOME_ECONOMIC_CATEGORIES,
  RESOLVER_CONFIDENCE_LEVELS,
  isExpenseEconomicCategory,
  isIncomeEconomicCategory,
  isResolverConfidence
} from '../types'

describe('TASK-768 economic-category/types', () => {
  it('EXPENSE_ECONOMIC_CATEGORIES tiene exactamente 11 valores canónicos', () => {
    expect(EXPENSE_ECONOMIC_CATEGORIES).toHaveLength(11)
    expect(EXPENSE_ECONOMIC_CATEGORIES).toEqual([
      'labor_cost_internal',
      'labor_cost_external',
      'vendor_cost_saas',
      'vendor_cost_professional_services',
      'regulatory_payment',
      'tax',
      'financial_cost',
      'bank_fee_real',
      'overhead',
      'financial_settlement',
      'other'
    ])
  })

  it('INCOME_ECONOMIC_CATEGORIES tiene exactamente 8 valores canónicos', () => {
    expect(INCOME_ECONOMIC_CATEGORIES).toHaveLength(8)
    expect(INCOME_ECONOMIC_CATEGORIES).toEqual([
      'service_revenue',
      'client_reimbursement',
      'factoring_proceeds',
      'partner_payout_offset',
      'internal_transfer_in',
      'tax_refund',
      'financial_income',
      'other'
    ])
  })

  it('RESOLVER_CONFIDENCE_LEVELS tiene 4 niveles', () => {
    expect(RESOLVER_CONFIDENCE_LEVELS).toEqual(['high', 'medium', 'low', 'manual_required'])
  })

  describe('isExpenseEconomicCategory', () => {
    it('acepta cada categoría canónica', () => {
      for (const category of EXPENSE_ECONOMIC_CATEGORIES) {
        expect(isExpenseEconomicCategory(category)).toBe(true)
      }
    })

    it('rechaza valores que no son strings', () => {
      expect(isExpenseEconomicCategory(null)).toBe(false)
      expect(isExpenseEconomicCategory(undefined)).toBe(false)
      expect(isExpenseEconomicCategory(42)).toBe(false)
      expect(isExpenseEconomicCategory({})).toBe(false)
    })

    it('rechaza strings que no son canónicos', () => {
      expect(isExpenseEconomicCategory('payroll')).toBe(false) // ese es expense_type legacy, no economic
      expect(isExpenseEconomicCategory('supplier')).toBe(false)
      expect(isExpenseEconomicCategory('vendor_cost')).toBe(false) // viejo, antes del split
      expect(isExpenseEconomicCategory('LABOR_COST_INTERNAL')).toBe(false) // case-sensitive
      expect(isExpenseEconomicCategory('')).toBe(false)
    })
  })

  describe('isIncomeEconomicCategory', () => {
    it('acepta cada categoría canónica', () => {
      for (const category of INCOME_ECONOMIC_CATEGORIES) {
        expect(isIncomeEconomicCategory(category)).toBe(true)
      }
    })

    it('rechaza categorías de expense (cross-domain)', () => {
      expect(isIncomeEconomicCategory('labor_cost_internal')).toBe(false)
      expect(isIncomeEconomicCategory('regulatory_payment')).toBe(false)
    })

    it('rechaza strings genéricos', () => {
      expect(isIncomeEconomicCategory('service')).toBe(false)
      expect(isIncomeEconomicCategory('revenue')).toBe(false)
    })
  })

  describe('isResolverConfidence', () => {
    it('acepta cada nivel canónico', () => {
      for (const level of RESOLVER_CONFIDENCE_LEVELS) {
        expect(isResolverConfidence(level)).toBe(true)
      }
    })

    it('rechaza otros valores', () => {
      expect(isResolverConfidence('automatic')).toBe(false)
      expect(isResolverConfidence(0)).toBe(false)
      expect(isResolverConfidence(null)).toBe(false)
    })
  })
})
