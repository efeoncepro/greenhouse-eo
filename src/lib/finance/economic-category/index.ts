/**
 * TASK-768 — Public API del módulo Finance Economic Category Dimension.
 *
 * Re-exports canónicos. Consumers deben importar desde este barrel:
 *   import { resolveExpenseEconomicCategory, type ExpenseEconomicCategory } from '@/lib/finance/economic-category'
 */

export {
  EXPENSE_ECONOMIC_CATEGORIES,
  INCOME_ECONOMIC_CATEGORIES,
  RESOLVER_CONFIDENCE_LEVELS,
  isExpenseEconomicCategory,
  isIncomeEconomicCategory,
  isResolverConfidence,
  type ExpenseEconomicCategory,
  type IncomeEconomicCategory,
  type ResolverConfidence
} from './types'

export {
  extractRutsFromText,
  lookupKnownPayrollVendor,
  lookupKnownRegulator,
  lookupMemberByDisplayName,
  lookupMemberByEmail,
  lookupMemberByRut,
  lookupSupplierByRut,
  type ResolvedMember,
  type ResolvedSupplier
} from './identity-lookup'

export {
  resolveExpenseEconomicCategory,
  resolveIncomeEconomicCategory,
  type ResolveExpenseInput,
  type ResolveIncomeInput,
  type ResolveExpenseResult,
  type ResolveIncomeResult
} from './resolver'
