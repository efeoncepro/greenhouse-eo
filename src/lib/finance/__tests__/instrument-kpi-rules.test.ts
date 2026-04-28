/**
 * TASK-720 — instrument-kpi-rules helper tests.
 *
 * Cubre:
 *   1. aggregateBankKpis distingue asset vs liability correctamente
 *   2. liability con net_worth_sign=-1 resta a net worth
 *   3. payroll_processor (transit) NO contribuye a nada
 *   4. credit_card no contribuye a cash, sí a net worth (negativo)
 *   5. shareholder_account no contribuye a cash, sí a net worth (negativo)
 *   6. Cuentas con instrument_category=null se ignoran defensivamente
 *   7. MissingKpiRuleError fail-fast cuando categoría sin rule
 *   8. byGroup breakdown agrupa correctamente cash / credit / platform_internal
 *   9. Caso real: composición Banco abril 2026 (post-fix expected: $4,181,125)
 */
import { describe, expect, it } from 'vitest'

import {
  aggregateBankKpis,
  MissingKpiRuleError,
  type KpiRule,
  type AccountForAggregation
} from '@/lib/finance/instrument-kpi-rules'

const STANDARD_RULES: KpiRule[] = [
  {
    instrumentCategory: 'bank_account',
    accountKind: 'asset',
    contributesToCash: true,
    contributesToConsolidatedClp: true,
    contributesToNetWorth: true,
    netWorthSign: 1,
    displayLabel: 'Cuenta corriente',
    displayGroup: 'cash',
    rationale: 'test'
  },
  {
    instrumentCategory: 'fintech',
    accountKind: 'asset',
    contributesToCash: true,
    contributesToConsolidatedClp: true,
    contributesToNetWorth: true,
    netWorthSign: 1,
    displayLabel: 'Fintech',
    displayGroup: 'cash',
    rationale: 'test'
  },
  {
    instrumentCategory: 'payment_platform',
    accountKind: 'asset',
    contributesToCash: true,
    contributesToConsolidatedClp: true,
    contributesToNetWorth: true,
    netWorthSign: 1,
    displayLabel: 'Plataforma',
    displayGroup: 'cash',
    rationale: 'test'
  },
  {
    instrumentCategory: 'payroll_processor',
    accountKind: 'asset',
    contributesToCash: false,
    contributesToConsolidatedClp: false,
    contributesToNetWorth: false,
    netWorthSign: 1,
    displayLabel: 'Procesador',
    displayGroup: 'platform_internal',
    rationale: 'transit'
  },
  {
    instrumentCategory: 'credit_card',
    accountKind: 'liability',
    contributesToCash: false,
    contributesToConsolidatedClp: false,
    contributesToNetWorth: true,
    netWorthSign: -1,
    displayLabel: 'TC',
    displayGroup: 'credit',
    rationale: 'liability'
  },
  {
    instrumentCategory: 'shareholder_account',
    accountKind: 'liability',
    contributesToCash: false,
    contributesToConsolidatedClp: false,
    contributesToNetWorth: true,
    netWorthSign: -1,
    displayLabel: 'CCA',
    displayGroup: 'platform_internal',
    rationale: 'liability'
  }
]

describe('TASK-720 aggregateBankKpis', () => {
  it('asset CLP cuenta contribuye a cash, consolidated, net worth', () => {
    const accounts: AccountForAggregation[] = [
      { currency: 'CLP', closingBalance: 1000, closingBalanceClp: 1000, instrumentCategory: 'bank_account' }
    ]

    const result = aggregateBankKpis(accounts, STANDARD_RULES)

    expect(result.totalCashByCurrency.CLP).toBe(1000)
    expect(result.consolidatedCashClp).toBe(1000)
    expect(result.netWorthClp).toBe(1000)
    expect(result.byGroup.cash).toBe(1000)
    expect(result.byGroup.credit).toBe(0)
    expect(result.byGroup.platformInternal).toBe(0)
  })

  it('liability credit_card no contribuye a cash pero sí a net worth (negativo)', () => {
    const accounts: AccountForAggregation[] = [
      { currency: 'CLP', closingBalance: 1141273, closingBalanceClp: 1141273, instrumentCategory: 'credit_card' }
    ]

    const result = aggregateBankKpis(accounts, STANDARD_RULES)

    expect(result.totalCashByCurrency.CLP ?? 0).toBe(0)
    expect(result.consolidatedCashClp).toBe(0)
    expect(result.netWorthClp).toBe(-1141273)
    expect(result.byGroup.cash).toBe(0)
    expect(result.byGroup.credit).toBe(1141273)
  })

  it('shareholder_account suma a platform_internal, no a cash', () => {
    const accounts: AccountForAggregation[] = [
      { currency: 'CLP', closingBalance: 172495, closingBalanceClp: 172495, instrumentCategory: 'shareholder_account' }
    ]

    const result = aggregateBankKpis(accounts, STANDARD_RULES)

    expect(result.totalCashByCurrency.CLP ?? 0).toBe(0)
    expect(result.consolidatedCashClp).toBe(0)
    expect(result.netWorthClp).toBe(-172495)
    expect(result.byGroup.platformInternal).toBe(172495)
  })

  it('payroll_processor (transit) NO contribuye a nada', () => {
    const accounts: AccountForAggregation[] = [
      { currency: 'CLP', closingBalance: 500000, closingBalanceClp: 500000, instrumentCategory: 'payroll_processor' }
    ]

    const result = aggregateBankKpis(accounts, STANDARD_RULES)

    expect(result.totalCashByCurrency.CLP ?? 0).toBe(0)
    expect(result.consolidatedCashClp).toBe(0)
    expect(result.netWorthClp).toBe(0)
    expect(result.byGroup.platformInternal).toBe(500000)
  })

  it('cuenta con instrument_category=null se ignora defensivamente', () => {
    const accounts: AccountForAggregation[] = [
      { currency: 'CLP', closingBalance: 1000, closingBalanceClp: 1000, instrumentCategory: 'bank_account' },
      { currency: 'CLP', closingBalance: 999999, closingBalanceClp: 999999, instrumentCategory: null }
    ]

    const result = aggregateBankKpis(accounts, STANDARD_RULES)

    expect(result.totalCashByCurrency.CLP).toBe(1000)
    expect(result.consolidatedCashClp).toBe(1000)
  })

  it('MissingKpiRuleError fail-fast cuando categoría sin rule', () => {
    const accounts: AccountForAggregation[] = [
      { currency: 'CLP', closingBalance: 1000, closingBalanceClp: 1000, instrumentCategory: 'unknown_category' }
    ]

    expect(() => aggregateBankKpis(accounts, STANDARD_RULES)).toThrow(MissingKpiRuleError)
    expect(() => aggregateBankKpis(accounts, STANDARD_RULES)).toThrow(/unknown_category/)
  })

  it('caso real Banco abril 2026: 4 asset + 2 liability', () => {
    const accounts: AccountForAggregation[] = [
      { currency: 'CLP', closingBalance: 4172563, closingBalanceClp: 4172563, instrumentCategory: 'bank_account' },
      { currency: 'CLP', closingBalance: 8562, closingBalanceClp: 8562, instrumentCategory: 'fintech' },
      { currency: 'CLP', closingBalance: 0, closingBalanceClp: 0, instrumentCategory: 'payment_platform' },
      { currency: 'CLP', closingBalance: 0, closingBalanceClp: 0, instrumentCategory: 'payroll_processor' },
      { currency: 'CLP', closingBalance: 1141273, closingBalanceClp: 1141273, instrumentCategory: 'credit_card' },
      { currency: 'CLP', closingBalance: 172495, closingBalanceClp: 172495, instrumentCategory: 'shareholder_account' }
    ]

    const result = aggregateBankKpis(accounts, STANDARD_RULES)

    // POST-FIX EXPECTED VALUES:
    expect(result.totalCashByCurrency.CLP).toBe(4181125) // Santander + Global66 + Deel
    expect(result.consolidatedCashClp).toBe(4181125)
    expect(result.netWorthClp).toBe(4181125 - 1141273 - 172495) // = 2,867,357
    expect(result.byGroup.cash).toBe(4181125)
    expect(result.byGroup.credit).toBe(1141273)
    expect(result.byGroup.platformInternal).toBe(172495)
  })

  it('mezcla CLP + USD acumula por moneda separada', () => {
    const accounts: AccountForAggregation[] = [
      { currency: 'CLP', closingBalance: 1000, closingBalanceClp: 1000, instrumentCategory: 'bank_account' },
      { currency: 'USD', closingBalance: 50, closingBalanceClp: 45000, instrumentCategory: 'bank_account' }
    ]

    const result = aggregateBankKpis(accounts, STANDARD_RULES)

    expect(result.totalCashByCurrency.CLP).toBe(1000)
    expect(result.totalCashByCurrency.USD).toBe(50)
    expect(result.consolidatedCashClp).toBe(46000)
    expect(result.netWorthByCurrency.CLP).toBe(1000)
    expect(result.netWorthByCurrency.USD).toBe(50)
  })

  it('rounding aplicado a salidas (decimales)', () => {
    const accounts: AccountForAggregation[] = [
      { currency: 'CLP', closingBalance: 100.123, closingBalanceClp: 100.123, instrumentCategory: 'bank_account' },
      { currency: 'CLP', closingBalance: 200.456, closingBalanceClp: 200.456, instrumentCategory: 'bank_account' }
    ]

    const result = aggregateBankKpis(accounts, STANDARD_RULES)

    expect(result.totalCashByCurrency.CLP).toBe(300.58)
    expect(result.consolidatedCashClp).toBe(300.58)
  })

  it('liability con sign convention TASK-703: negative net worth', () => {
    const accounts: AccountForAggregation[] = [
      { currency: 'CLP', closingBalance: 1000, closingBalanceClp: 1000, instrumentCategory: 'bank_account' },
      { currency: 'CLP', closingBalance: 1500, closingBalanceClp: 1500, instrumentCategory: 'credit_card' }
    ]

    const result = aggregateBankKpis(accounts, STANDARD_RULES)

    expect(result.netWorthClp).toBe(-500)
    expect(result.netWorthByCurrency.CLP).toBe(-500)
  })
})
